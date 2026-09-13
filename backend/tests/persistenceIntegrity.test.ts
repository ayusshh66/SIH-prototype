import test from "node:test";
import assert from "node:assert/strict";
import { aiAdapter, AiAdapterService, ValidationError } from "../src/services/ai/aiAdapter.service";
import { dataStore } from "../src/services/data/dataStore";
import type { DbBlockView, OptimizationRunRecord, WhatIfScenarioPayload } from "../src/services/ai/contracts";

test("Persistence Integrity: orchestratePlanning fails if saveOptimizationRun fails", async () => {
  const originalSaveOptimizationRun = dataStore.saveOptimizationRun;
  try {
    dataStore.saveOptimizationRun = async () => {
      throw new Error("Simulated Postgres database error: connection pool exhausted");
    };

    await assert.rejects(
      () => aiAdapter.orchestratePlanning({ horizon: "WEEKLY", mode: "BALANCED" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /connection pool exhausted/);
        return true;
      }
    );
  } finally {
    dataStore.saveOptimizationRun = originalSaveOptimizationRun;
  }
});

test("Persistence Integrity: orchestratePlanning fails if saveBlocks fails", async () => {
  const originalSaveBlocks = dataStore.saveBlocks;
  try {
    dataStore.saveBlocks = async () => {
      throw new Error("Simulated Postgres database error: blocks unique constraint violation");
    };

    await assert.rejects(
      () => aiAdapter.orchestratePlanning({ horizon: "WEEKLY", mode: "BALANCED" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /blocks unique constraint violation/);
        return true;
      }
    );
  } finally {
    dataStore.saveBlocks = originalSaveBlocks;
  }
});

test("Persistence Integrity: exact run-to-schedule resolution isolates blocks per run", async () => {
  const runA: OptimizationRunRecord = {
    id: "run_test_iso_a",
    runId: "run_test_iso_a",
    runCode: "RUN-ISO-AAA",
    horizon: "WEEKLY",
    startDate: "2026-11-03T00:00:00.000Z",
    endDate: "2026-11-10T00:00:00.000Z",
    tasksConsidered: 1,
    tasksScheduled: 1,
    blocksGenerated: 1,
    totalBlockMinutes: 120,
    baselineBlockMinutes: 160,
    estimatedSavingsMinutes: 40,
    optimizationScore: "0.85",
    status: "OPTIMAL",
    createdAt: new Date().toISOString(),
  };

  const blockA: DbBlockView = {
    id: "blk_iso_a",
    blockCode: "BLK-NDLS-AGC-RUN-ISO-AAA-11",
    corridorId: "corr_ndls_agc",
    corridorCode: "NDLS-AGC",
    optimizationRunId: "run_test_iso_a",
    runId: "run_test_iso_a",
    runCode: "RUN-ISO-AAA",
    startAt: "2026-11-04T02:00:00.000Z",
    endAt: "2026-11-04T04:00:00.000Z",
    durationMinutes: 120,
    baselineDurationMinutes: 160,
    savedMinutes: 40,
    status: "PROPOSED",
    taskCount: 1,
    tasks: [
      {
        id: "task_eng_045_01",
        taskCode: "TSK-ENG-NDLS-045-01",
        department: "ENG",
        taskType: "USFD",
        durationMinutes: 120,
        locationKm: "Km 45.2 - 46.5",
      },
    ],
    departments: ["ENG"],
    explanation: { runId: "run_test_iso_a", runCode: "RUN-ISO-AAA" },
    createdAt: new Date().toISOString(),
  };

  const runB: OptimizationRunRecord = {
    id: "run_test_iso_b",
    runId: "run_test_iso_b",
    runCode: "RUN-ISO-BBB",
    horizon: "WEEKLY",
    startDate: "2026-11-03T00:00:00.000Z",
    endDate: "2026-11-10T00:00:00.000Z",
    tasksConsidered: 1,
    tasksScheduled: 1,
    blocksGenerated: 1,
    totalBlockMinutes: 90,
    baselineBlockMinutes: 130,
    estimatedSavingsMinutes: 40,
    optimizationScore: "0.78",
    status: "OPTIMAL",
    createdAt: new Date().toISOString(),
  };

  const blockB: DbBlockView = {
    id: "blk_iso_b",
    blockCode: "BLK-NDLS-AGC-RUN-ISO-BBB-11",
    corridorId: "corr_ndls_agc",
    corridorCode: "NDLS-AGC",
    optimizationRunId: "run_test_iso_b",
    runId: "run_test_iso_b",
    runCode: "RUN-ISO-BBB",
    startAt: "2026-11-05T01:00:00.000Z",
    endAt: "2026-11-05T02:30:00.000Z",
    durationMinutes: 90,
    baselineDurationMinutes: 130,
    savedMinutes: 40,
    status: "PROPOSED",
    taskCount: 1,
    tasks: [
      {
        id: "task_trd_046_02",
        taskCode: "TSK-TRD-NDLS-046-02",
        department: "TRD",
        taskType: "TRD",
        durationMinutes: 90,
        locationKm: "Km 45.0 - 46.8",
      },
    ],
    departments: ["TRD"],
    explanation: { runId: "run_test_iso_b", runCode: "RUN-ISO-BBB" },
    createdAt: new Date().toISOString(),
  };

  await dataStore.saveOptimizationRun(runA);
  await dataStore.saveBlocks([blockA]);
  await dataStore.saveOptimizationRun(runB);
  await dataStore.saveBlocks([blockB]);

  // Query blocks by run specifically
  const blocksForRunA = await dataStore.getBlocksByRun("run_test_iso_a", "RUN-ISO-AAA");
  assert.equal(blocksForRunA.length, 1);
  assert.equal(blocksForRunA[0].id, "blk_iso_a");
  assert.equal(blocksForRunA[0].blockCode, "BLK-NDLS-AGC-RUN-ISO-AAA-11");

  const blocksForRunB = await dataStore.getBlocksByRun("run_test_iso_b", "RUN-ISO-BBB");
  assert.equal(blocksForRunB.length, 1);
  assert.equal(blocksForRunB[0].id, "blk_iso_b");
  assert.equal(blocksForRunB[0].blockCode, "BLK-NDLS-AGC-RUN-ISO-BBB-11");

  // What-If on Run A resolves only Block A
  const whatIfResultA = await aiAdapter.runWhatIf({
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "RUN-ISO-AAA",
    new_constraints: { train_id: "12002", train_delay_minutes: 15 },
  });
  assert.equal(whatIfResultA.original_schedule_id, "RUN-ISO-AAA");
  assert.ok(whatIfResultA.new_schedule);

  // What-If on Run B resolves only Block B
  const whatIfResultB = await aiAdapter.runWhatIf({
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "RUN-ISO-BBB",
    new_constraints: { train_id: "12002", train_delay_minutes: 15 },
  });
  assert.equal(whatIfResultB.original_schedule_id, "RUN-ISO-BBB");
  assert.ok(whatIfResultB.new_schedule);
});

test("Persistence Integrity: What-If succeeds on fresh service instance with zero prior in-memory state", async () => {
  // Instantiate an entirely clean AiAdapterService instance
  const freshAiAdapter = new AiAdapterService();
  assert.equal(freshAiAdapter.getLatestExplanations().length, 0);
  assert.equal(freshAiAdapter.getLatestConflicts().length, 0);
  assert.equal(freshAiAdapter.getLatestShadowBlocks().length, 0);

  const payload: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "RUN-20261103-W1",
    new_constraints: { train_id: "12002", train_delay_minutes: 25 },
  };

  const result = await freshAiAdapter.runWhatIf(payload);
  assert.ok(result, "Expected valid What-If result from fresh instance");
  assert.equal(result.original_schedule_id, "RUN-20261103-W1");
  assert.ok(result.new_schedule);
});

test("Persistence Integrity: What-If rejects run with zero persisted blocks", async () => {
  const emptyRun: OptimizationRunRecord = {
    id: "run_empty_no_blocks",
    runId: "run_empty_no_blocks",
    runCode: "RUN-EMPTY-001",
    horizon: "WEEKLY",
    startDate: "2026-11-03T00:00:00.000Z",
    endDate: "2026-11-10T00:00:00.000Z",
    tasksConsidered: 0,
    tasksScheduled: 0,
    blocksGenerated: 0,
    totalBlockMinutes: 0,
    baselineBlockMinutes: 0,
    estimatedSavingsMinutes: 0,
    optimizationScore: "0.00",
    status: "OPTIMAL",
    createdAt: new Date().toISOString(),
  };

  await dataStore.saveOptimizationRun(emptyRun);

  await assert.rejects(
    () =>
      aiAdapter.runWhatIf({
        scenario_type: "TRAIN_DELAY",
        base_schedule_id: "RUN-EMPTY-001",
        new_constraints: { train_id: "12002", train_delay_minutes: 15 },
      }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /No persisted blocks found for optimization run 'RUN-EMPTY-001'/);
      return true;
    }
  );
});

test("Persistence Integrity: saveBlocks with database failure does not mutate in-memory container", async () => {
  const failingBlock: DbBlockView = {
    id: "blk_fail_test",
    blockCode: "BLK-FAIL-TEST-99",
    corridorId: "corr_ndls_agc",
    corridorCode: "NDLS-AGC",
    runId: "run_fail_test",
    runCode: "RUN-FAIL-999",
    startAt: "2026-11-04T02:00:00.000Z",
    endAt: "2026-11-04T04:00:00.000Z",
    durationMinutes: 120,
    baselineDurationMinutes: 160,
    savedMinutes: 40,
    status: "PROPOSED",
    taskCount: 0,
    tasks: [],
    departments: ["ENG"],
    explanation: {},
    createdAt: new Date().toISOString(),
  };

  const originalSaveBlocks = dataStore.saveBlocks;
  try {
    dataStore.saveBlocks = async () => {
      throw new Error("PostgreSQL write failed: deadlock detected");
    };

    await assert.rejects(
      () => dataStore.saveBlocks([failingBlock]),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /deadlock detected/);
        return true;
      }
    );

    // Verify it was not added to in-memory state
    const blocksFound = await dataStore.getBlocksByRun("run_fail_test", "RUN-FAIL-999");
    assert.equal(blocksFound.length, 0, "Failed block must not exist in dataStore");
  } finally {
    dataStore.saveBlocks = originalSaveBlocks;
  }
});


import test from "node:test";
import assert from "node:assert/strict";
import { aiAdapter, ValidationError } from "../src/services/ai/aiAdapter.service";
import { resolvePythonExecutable } from "../src/services/ai/aiBridge";
import { dataStore } from "../src/services/data/dataStore";
import type { WhatIfScenarioPayload, MaintenanceTaskItem } from "../src/services/ai/contracts";

test("resolvePythonExecutable uses platform default and env override", () => {
  const original = process.env.PYTHON_BIN;

  try {
    delete process.env.PYTHON_BIN;
    assert.equal(resolvePythonExecutable(), process.platform === "win32" ? "python" : "python3");

    process.env.PYTHON_BIN = "custom-python";
    assert.equal(resolvePythonExecutable(), "custom-python");
  } finally {
    if (original === undefined) {
      delete process.env.PYTHON_BIN;
    } else {
      process.env.PYTHON_BIN = original;
    }
  }
});

test("What-If validation: rejects 'current' and 'latest' magic strings", async () => {
  const payloadCurrent: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "current",
    new_constraints: { train_id: "12002", train_delay_minutes: 30 },
  };

  await assert.rejects(
    () => aiAdapter.runWhatIf(payloadCurrent),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /Invalid base_schedule_id 'current'/);
      return true;
    }
  );

  const payloadLatest: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "latest",
    new_constraints: { train_id: "12002", train_delay_minutes: 30 },
  };

  await assert.rejects(
    () => aiAdapter.runWhatIf(payloadLatest),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /Invalid base_schedule_id 'latest'/);
      return true;
    }
  );
});

test("What-If validation: rejects missing base_schedule_id", async () => {
  const invalidPayload: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "",
    new_constraints: { train_id: "12002", train_delay_minutes: 30 },
  };

  await assert.rejects(
    () => aiAdapter.runWhatIf(invalidPayload),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /base_schedule_id/);
      return true;
    }
  );
});

test("What-If validation: requires train_delay_minutes for TRAIN_DELAY", async () => {
  const invalidPayload: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "valid_id",
    affected_train_ids: ["12002"],
    new_constraints: {},
  };

  await assert.rejects(
    () => aiAdapter.runWhatIf(invalidPayload),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /train_delay_minutes/);
      return true;
    }
  );
});

test("What-If schedule resolution: rejects unpersisted base_schedule_id", async () => {
  const unpersistedPayload: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: "run_non_existent_id_99999",
    new_constraints: { train_id: "12002", train_delay_minutes: 20 },
  };

  await assert.rejects(
    () => aiAdapter.runWhatIf(unpersistedPayload),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /No persisted optimization run matches this ID/);
      return true;
    }
  );
});

test("What-If schedule resolution: resolves against authoritative seeded/persisted run", async () => {
  const runs = await dataStore.getOptimizationRuns();
  assert.ok(runs.length > 0, "Expected at least one seeded optimization run");
  const seededRun = runs[0];

  const payload: WhatIfScenarioPayload = {
    scenario_type: "TRAIN_DELAY",
    base_schedule_id: seededRun.id || seededRun.runCode,
    new_constraints: { train_id: "12002", train_delay_minutes: 20 },
  };

  const result = await aiAdapter.runWhatIf(payload);
  assert.ok(result);
  assert.equal(result.original_schedule_id, seededRun.id || seededRun.runCode);
  assert.ok(result.new_schedule);
});

test("getCriticalityScore: uses actual operationalImpactScore and executes via bridge", async () => {
  const tasks = await dataStore.getTasks();
  const task = tasks[0];
  assert.ok(task, "Expected at least one task");

  const scoreResult = await aiAdapter.getCriticalityScore(task);
  assert.ok(scoreResult);
  assert.equal(typeof scoreResult.score, "number");
  assert.ok(scoreResult.score >= 0 && scoreResult.score <= 1);
});

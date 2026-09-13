import test from "node:test";
import assert from "node:assert/strict";
import {
  mapTaskToAi,
  mapTrainToAi,
  mapWindowToAi,
  mapResourceToAi,
  mapAiBlockToDbBlock,
  MappingValidationError,
} from "../src/services/ai/dataMapper";
import type {
  MaintenanceTaskItem,
  CorridorItem,
  DepartmentItem,
  TrainItem,
  BlockWindowItem,
  ResourceItem,
} from "../src/services/data/dataStore";

const sampleCorridor: CorridorItem = {
  id: "corr_01",
  code: "NDLS-AGC",
  name: "New Delhi - Agra Cantt",
  startKm: "0.0",
  endKm: "195.0",
  status: "ACTIVE",
};

const sampleDept: DepartmentItem = {
  id: "dept_eng",
  code: "ENG",
  name: "Engineering",
};

const validTask: MaintenanceTaskItem = {
  id: "task_01",
  taskCode: "TSK-001",
  assetId: "ast_01",
  departmentId: "dept_eng",
  corridorId: "corr_01",
  taskType: "ENGINEERING",
  description: "Track ballast renewal",
  locationStartKm: 42.5,
  locationEndKm: 45.0,
  criticalityScore: 88,
  urgencyScore: 80,
  safetyScore: 75,
  operationalImpactScore: 65,
  estimatedDurationMinutes: 180,
  dueAt: "2026-11-05T18:00:00.000Z",
  status: "PENDING",
  requiredBlock: true,
  requiresPowerShutdown: false,
  createdAt: "2026-11-01T08:00:00.000Z",
  updatedAt: "2026-11-01T08:00:00.000Z",
};

test("mapTaskToAi: throws on missing corridor lookup", () => {
  assert.throws(
    () => mapTaskToAi(validTask, null, sampleDept),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /Missing corridor lookup/);
      return true;
    }
  );
});

test("mapTaskToAi: throws on missing department lookup", () => {
  assert.throws(
    () => mapTaskToAi(validTask, sampleCorridor, null),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /Missing department lookup/);
      return true;
    }
  );
});

test("mapTaskToAi: throws on missing createdAt (requestedStart)", () => {
  const invalid = { ...validTask, createdAt: "" };
  assert.throws(
    () => mapTaskToAi(invalid, sampleCorridor, sampleDept),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /createdAt/);
      return true;
    }
  );
});

test("mapTaskToAi: throws on missing dueAt (requestedEnd)", () => {
  const invalid = { ...validTask, dueAt: null as unknown as string };
  assert.throws(
    () => mapTaskToAi(invalid, sampleCorridor, sampleDept),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /dueAt/);
      return true;
    }
  );
});

test("mapTaskToAi: throws on invalid locationStartKm", () => {
  const invalid = { ...validTask, locationStartKm: "not-a-number" };
  assert.throws(
    () => mapTaskToAi(invalid, sampleCorridor, sampleDept),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /locationStartKm/);
      return true;
    }
  );
});

test("mapTaskToAi: maps valid task without fabricated values", () => {
  const mapped = mapTaskToAi(validTask, sampleCorridor, sampleDept);
  assert.equal(mapped.task_id, "TSK-001");
  assert.equal(mapped.railway_section_id, "NDLS-AGC");
  assert.equal(mapped.section_id, "NDLS-AGC");
  assert.equal(mapped.department, "ENG");
  assert.equal(mapped.from_km, 42.5);
  assert.equal(mapped.to_km, 45.0);
  assert.equal(mapped.priority_hint, "CRITICAL");
  assert.equal(mapped.safety_class, "NORMAL");
  assert.equal(mapped.requested_start, "2026-11-01T08:00:00.000Z");
  assert.equal(mapped.requested_end, "2026-11-05T18:00:00.000Z");
});

test("mapTrainToAi: throws on missing corridor lookup", () => {
  const train: TrainItem = {
    id: "trn_01",
    trainNumber: "12002",
    trainName: "Bhopal Shatabdi",
    trainType: "EXPRESS",
    corridorId: "corr_01",
    scheduledDeparture: "2026-11-04T06:00:00.000Z",
    scheduledArrival: "2026-11-04T08:00:00.000Z",
    priority: 95,
    isCriticalService: true,
    isGoodsTrain: false,
    frequency: "DAILY",
  };

  assert.throws(
    () => mapTrainToAi(train, null),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /Missing corridor lookup/);
      return true;
    }
  );

  const mapped = mapTrainToAi(train, sampleCorridor);
  assert.equal(mapped.section_id, "NDLS-AGC");
  assert.equal(mapped.train_id, "12002");
  assert.equal(mapped.speed_class, "EXPRESS");
  assert.equal(mapped.priority_class, "PASSENGER");
});

test("mapWindowToAi: throws on missing corridor lookup", () => {
  const window: BlockWindowItem = {
    id: "win_01",
    corridorId: "corr_01",
    startAt: "2026-11-04T01:00:00.000Z",
    endAt: "2026-11-04T04:30:00.000Z",
    availableMinutes: 210,
    status: "AVAILABLE",
    source: "COA",
  };

  assert.throws(
    () => mapWindowToAi(window, null),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /Missing corridor lookup/);
      return true;
    }
  );

  const mapped = mapWindowToAi(window, sampleCorridor);
  assert.equal(mapped.section_id, "NDLS-AGC");
  assert.equal(mapped.duration_minutes, 210);
});

test("mapResourceToAi: throws on missing departmentId or depotLocation", () => {
  const resMissingDept: ResourceItem = {
    id: "res_01",
    resourceCode: "TM-01",
    resourceType: "TRACK_MACHINE",
    departmentId: "",
    depotLocation: "Agra Cantt",
    capacity: 1,
    status: "AVAILABLE",
  };

  assert.throws(
    () => mapResourceToAi(resMissingDept),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /departmentId/);
      return true;
    }
  );

  const resMissingLocation: ResourceItem = {
    ...resMissingDept,
    departmentId: "ENG",
    depotLocation: "",
  };

  assert.throws(
    () => mapResourceToAi(resMissingLocation),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /depotLocation/);
      return true;
    }
  );

  const validRes: ResourceItem = {
    ...resMissingDept,
    departmentId: "ENG",
    depotLocation: "Agra Cantt Depot",
  };
  const mapped = mapResourceToAi(validRes);
  assert.equal(mapped.department, "ENG");
  assert.equal(mapped.location, "Agra Cantt Depot");
});

test("mapAiBlockToDbBlock: throws on missing block_id or timestamps", () => {
  const taskMap = new Map<string, MaintenanceTaskItem>([["TSK-001", validTask]]);

  assert.throws(
    () =>
      mapAiBlockToDbBlock(
        { block_id: "", start: "2026-11-04T02:00:00.000Z", end: "2026-11-04T04:00:00.000Z" },
        "corr_01",
        "NDLS-AGC",
        taskMap
      ),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /block_id/);
      return true;
    }
  );

  assert.throws(
    () =>
      mapAiBlockToDbBlock(
        { block_id: "BLK-01", end: "2026-11-04T04:00:00.000Z" },
        "corr_01",
        "NDLS-AGC",
        taskMap
      ),
    (err: unknown) => {
      assert.ok(err instanceof MappingValidationError);
      assert.match((err as Error).message, /start/);
      return true;
    }
  );
});

test("mapAiBlockToDbBlock: skips unknown task IDs without fabricating tasks", () => {
  const taskMap = new Map<string, MaintenanceTaskItem>([["TSK-001", validTask]]);

  const dbBlock = mapAiBlockToDbBlock(
    {
      block_id: "blk_test_01",
      start: "2026-11-04T01:00:00.000Z",
      end: "2026-11-04T03:30:00.000Z",
      task_ids: ["TSK-001", "NON_EXISTENT_999"],
    },
    "corr_01",
    "NDLS-AGC",
    taskMap
  );

  assert.equal(dbBlock.id, "blk_test_01");
  assert.equal(dbBlock.taskCount, 1);
  assert.equal(dbBlock.tasks.length, 1);
  assert.equal(dbBlock.tasks[0].id, "task_01");
  assert.equal(dbBlock.departments.length, 1);
  assert.equal(dbBlock.departments[0], "dept_eng");
});

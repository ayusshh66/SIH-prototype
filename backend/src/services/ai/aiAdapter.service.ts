import { invokeAiBridge } from "./aiBridge";
import {
  mapAiBlockToDbBlock,
  mapResourceToAi,
  mapTaskToAi,
  mapTrainToAi,
  mapWindowToAi,
  MappingValidationError,
} from "./dataMapper";
import type { AiBlockInput } from "./dataMapper";
import { dataStore, MaintenanceTaskItem, CorridorItem, DepartmentItem } from "../data/dataStore";
import type {
  AiHealthResult,
  CriticalityScore,
  DbBlockView,
  EmergencyEventPayload,
  EmergencyResult,
  Explanation,
  OrchestrationResult,
  PlanningContext,
  PlanningOptions,
  PlanningResult,
  ScheduleCandidate,
  ShadowBlockCandidate,
  WhatIfResult,
  WhatIfScenarioPayload,
} from "./contracts";

const SUCCESSFUL_OPT_STATUSES = new Set(["OPTIMAL", "FEASIBLE", "PARTIAL"]);

function ensureFiniteNumber(value: unknown, field: string): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new ValidationError(`Missing or invalid required field '${field}'.`);
  }
  return numeric;
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`Missing or invalid required field '${field}'.`);
  }
  return value.trim();
}

export class ValidationError extends Error {
  statusCode = 400;
}

/** Shape of an individual compatibility candidate returned by AI. */
interface CompatibilityCandidate {
  task_ids: string[];
  sections: string[];
  departments: string[];
  compatibility_score: number;
  reasons: string[];
}

export class AiAdapterService {
  private latestExplanations: Explanation[] = [];
  private latestConflicts: PlanningResult["train_conflicts"] = [];
  private latestShadowBlocks: ShadowBlockCandidate[] = [];

  async orchestratePlanning(options: PlanningOptions = {}): Promise<PlanningResult> {
    const horizon = options.horizon || "WEEKLY";
    const mode = options.mode || "BALANCED";

    const contextData = await this.buildPlanningContextData(options.corridorId);
    const { allCorridors, taskMap } = contextData;
    const canonicalRequest: PlanningContext = {
      request_id: `plan_req_${Date.now().toString(36)}`,
      mode,
      tasks: contextData.aiTasks,
      train_movements: contextData.aiTrains,
      resources: contextData.aiResources,
      maintenance_windows: contextData.aiWindows,
      constraints: {
        safety_rules: true,
        deadline_hard: true,
        resource_capacity: true,
      },
      weights: {
        maintenance_value: 0.45,
        shadow_block_benefit: 0.25,
        train_disruption_penalty: 0.3,
      },
      solver_settings: {
        max_runtime_seconds: 10,
        allow_partial_solution: true,
      },
    };

    const aiResult = await invokeAiBridge<PlanningContext, OrchestrationResult>("plan", canonicalRequest);
    this.assertOrchestrationSuccess(aiResult);

    const optResult = aiResult.optimization_result;
    if (!optResult) {
      throw new Error("AI Orchestration Failure: optimization_result was not returned.");
    }

    this.latestExplanations = aiResult.explanations;
    this.latestShadowBlocks = aiResult.shadow_block_candidates;
    this.latestConflicts = optResult.train_conflicts || [];

    for (const cs of aiResult.criticality_scores) {
      await this.persistCriticalityScore(cs);
    }

    const targetCorridor =
      allCorridors.find((c) => c.id === options.corridorId || c.code === options.corridorId) ||
      allCorridors[0];

    const runId = aiResult.orchestration_id;
    const runCode = `RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const generatedBlocks: DbBlockView[] = [];

    for (let candIdx = 0; candIdx < (optResult.schedule_candidates || []).length; candIdx++) {
      const cand = optResult.schedule_candidates[candIdx];
      const candBlocks = (cand.blocks || []) as AiBlockInput[];
      for (let blkIdx = 0; blkIdx < candBlocks.length; blkIdx++) {
        const blk = candBlocks[blkIdx];
        const durationMinutes =
          blk.durationMinutes ||
          Math.max(
            0,
            Math.round(
              (new Date(blk.end || blk.end_time || "").getTime() -
                new Date(blk.start || blk.start_time || "").getTime()) /
                60000
            )
          );
        const mappedBlock = mapAiBlockToDbBlock(
          {
            ...blk,
            block_code: `BLK-${targetCorridor?.code || "SEC"}-${runCode}-${candIdx + 1}${blkIdx + 1}`,
            durationMinutes,
            task_ids: cand.task_ids || optResult.selected_task_ids,
          },
          targetCorridor?.id || "",
          targetCorridor?.code || "",
          taskMap
        );
        mappedBlock.runId = runId;
        mappedBlock.runCode = runCode;
        if (mappedBlock.explanation) {
          mappedBlock.explanation.runId = runId;
          mappedBlock.explanation.runCode = runCode;
        }
        generatedBlocks.push(mappedBlock);
      }
    }

    const scheduledCount = optResult.selected_task_ids.length;
    const totalConsidered = contextData.targetTasks.length;
    const baselineMinutes = generatedBlocks.reduce((acc, b) => acc + (b.baselineDurationMinutes || 0), 0);
    const totalBlockMinutes = generatedBlocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const savedMinutes = Math.max(baselineMinutes - totalBlockMinutes, 0);

    // Save optimization run to authoritative backend store (fails if persistence fails)
    const runRecord = await dataStore.saveOptimizationRun({
      id: runId,
      runId,
      runCode,
      horizon,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + (horizon === "MONTHLY" ? 30 : 7) * 86400000).toISOString(),
      tasksConsidered: totalConsidered,
      tasksScheduled: scheduledCount,
      blocksGenerated: generatedBlocks.length,
      totalBlockMinutes,
      baselineBlockMinutes: baselineMinutes,
      estimatedSavingsMinutes: savedMinutes,
      optimizationScore: String(optResult.objective_score),
      status: optResult.status,
      createdAt: new Date().toISOString(),
    });

    const persistedRunId = runRecord?.id || runId;

    for (const b of generatedBlocks) {
      b.optimizationRunId = persistedRunId;
      b.runId = persistedRunId;
    }

    // Save generated blocks associated with this run (fails if persistence fails)
    if (generatedBlocks.length > 0) {
      await dataStore.saveBlocks(generatedBlocks, persistedRunId);
    }

    const result: PlanningResult = {
      ...optResult,
      runId: runRecord?.id || aiResult.orchestration_id,
      runCode,
      status: optResult.status,
      orchestrationId: aiResult.orchestration_id,
      executionSequence: aiResult.execution_sequence,
      shadow_blocks: aiResult.shadow_block_candidates,
      train_conflicts: optResult.train_conflicts || [],
      explanations: aiResult.explanations,
      blocks: generatedBlocks,
      summary: {
        tasksConsidered: totalConsidered,
        tasksScheduled: scheduledCount,
        blocksGenerated: generatedBlocks.length,
        baselineBlockMinutes: baselineMinutes,
        optimizedBlockMinutes: totalBlockMinutes,
        savingMinutes: savedMinutes,
        savingPercentage: baselineMinutes > 0 ? Math.round((savedMinutes / baselineMinutes) * 100) : 0,
        optimizationScore: optResult.objective_score,
      },
    };

    return result;
  }

  async getCriticalityScore(task: MaintenanceTaskItem): Promise<CriticalityScore> {
    // Use real backend fields instead of hardcoded values
    const trafficDensity = Math.min(1, (task.operationalImpactScore || 0) / 100);
    const input = {
      entity_id: task.taskCode || task.id,
      severity: task.criticalityScore >= 85 ? "CRITICAL" : task.criticalityScore >= 70 ? "HIGH" : "MODERATE",
      urgency: Math.min(1, (task.urgencyScore || 0) / 100),
      safety_risk: Math.min(1, (task.safetyScore || 0) / 100),
      traffic_density: trafficDensity,
      // No hardcoded speed_class — let AI engine use its default if not provided
      deadline: task.dueAt || undefined,
    };

    const result = await invokeAiBridge<typeof input, CriticalityScore>("criticality", input);
    await dataStore.updateTaskCriticality(task.id, result.score, (result.score * 100).toFixed(1), result);
    return result;
  }

  async generateShadowBlocks(options?: { constraints?: Record<string, unknown> }): Promise<{
    compatibility_candidates: CompatibilityCandidate[];
    shadow_block_candidates: ShadowBlockCandidate[];
  }> {
    const contextData = await this.buildPlanningContextData();
    const payload = {
      tasks: contextData.aiTasks,
      maintenance_windows: contextData.aiWindows,
      resources: contextData.aiResources,
      constraints: options?.constraints || {},
    };

    const res = await invokeAiBridge<typeof payload, {
      compatibility_candidates: CompatibilityCandidate[];
      shadow_block_candidates: ShadowBlockCandidate[];
    }>("shadow_blocks", payload);

    this.latestShadowBlocks = res.shadow_block_candidates || [];
    return res;
  }

  async runWhatIf(scenarioPayload: WhatIfScenarioPayload): Promise<WhatIfResult> {
    const scenario = this.validateWhatIfScenario(scenarioPayload);
    const context = await this.resolvePlanningContext();
    const currentSchedule = await this.resolveSchedule(scenario.base_schedule_id);

    const whatIfPayload = {
      scenario: {
        ...scenario,
        scenario_id: scenario.scenario_id || `whatif_${Date.now().toString(36)}`,
        created_at: new Date().toISOString(),
      },
      current_schedule: currentSchedule,
      context,
    };

    const res = await invokeAiBridge<typeof whatIfPayload, WhatIfResult>("what_if", whatIfPayload);
    if (res.errors?.length) {
      throw new Error(`What-If engine rejected scenario: ${res.errors.join("; ")}`);
    }
    if (!res.new_schedule || res.optimization_result?.status === "INFEASIBLE" || res.optimization_result?.status === "FAILED") {
      throw new Error(`What-If solver did not produce a feasible schedule for '${scenario.base_schedule_id}'.`);
    }
    return res;
  }

  async runEmergency(emergencyEvent: EmergencyEventPayload): Promise<EmergencyResult> {
    const event = this.validateEmergencyEvent(emergencyEvent);
    const context = await this.resolvePlanningContext();
    const [allTasks, allTrains, allWindows, allResources, allCorridors, allDepts] = await Promise.all([
      dataStore.getTasks(),
      dataStore.getTrains(),
      dataStore.getBlockWindows(),
      dataStore.getResources(),
      dataStore.getCorridors(),
      dataStore.getDepartments(),
    ]);

    const corridorMap = new Map<string, CorridorItem>();
    for (const c of allCorridors) {
      corridorMap.set(c.id, c);
      if (c.code) corridorMap.set(c.code, c);
    }
    const deptMap = new Map<string, DepartmentItem>();
    for (const d of allDepts) {
      deptMap.set(d.id, d);
      if (d.code) deptMap.set(d.code, d);
    }

    const emergencyPayload = {
      emergency_event: {
        ...event,
        event_id: event.event_id || `emg_${Date.now().toString(36)}`,
        detected_at: event.detected_at || new Date().toISOString(),
      },
      current_state: {
        ...context,
        existing_tasks: allTasks.map((t) => mapTaskToAi(t, corridorMap.get(t.corridorId), deptMap.get(t.departmentId))),
        train_movements: allTrains.map((t) => mapTrainToAi(t, corridorMap.get(t.corridorId))),
        resources: allResources.map((r) => mapResourceToAi(r)),
        windows: allWindows.map((w) => mapWindowToAi(w, corridorMap.get(w.corridorId))),
      },
    };

    const res = await invokeAiBridge<typeof emergencyPayload, EmergencyResult>("emergency", emergencyPayload);
    if (res.errors?.length) {
      throw new Error(`Emergency engine rejected event: ${res.errors.join("; ")}`);
    }
    if (!res.resulting_schedule || res.optimization_result?.status === "INFEASIBLE" || res.optimization_result?.status === "FAILED") {
      throw new Error("Emergency solver did not produce a feasible resulting schedule.");
    }
    return res;
  }

  async checkAiHealth(): Promise<AiHealthResult> {
    return invokeAiBridge<Record<string, never>, AiHealthResult>("health", {});
  }

  getLatestExplanations(): Explanation[] {
    return this.latestExplanations;
  }

  getLatestConflicts(): PlanningResult["train_conflicts"] {
    return this.latestConflicts;
  }

  getLatestShadowBlocks(): ShadowBlockCandidate[] {
    return this.latestShadowBlocks;
  }

  private async buildPlanningContextData(corridorId?: string) {
    const [allTasks, allTrains, allWindows, allResources, allCorridors, allDepts] = await Promise.all([
      dataStore.getTasks(),
      dataStore.getTrains(),
      dataStore.getBlockWindows(),
      dataStore.getResources(),
      dataStore.getCorridors(),
      dataStore.getDepartments(),
    ]);

    const corridorMap = new Map<string, CorridorItem>();
    for (const c of allCorridors) {
      corridorMap.set(c.id, c);
      if (c.code) corridorMap.set(c.code, c);
    }
    const deptMap = new Map<string, DepartmentItem>();
    for (const d of allDepts) {
      deptMap.set(d.id, d);
      if (d.code) deptMap.set(d.code, d);
    }
    const taskMap = new Map(allTasks.map((t) => [t.taskCode || t.id, t]));

    let targetTasks = allTasks.filter((t) => t.status === "PENDING" && t.requiredBlock);
    if (corridorId && corridorId !== "all") {
      targetTasks = targetTasks.filter((t) => t.corridorId === corridorId || corridorMap.get(t.corridorId)?.code === corridorId);
    }

    if (targetTasks.length === 0) {
      throw new ValidationError("No pending block-required maintenance tasks found for the requested planning context.");
    }

    return {
      allTasks,
      allCorridors,
      targetTasks,
      taskMap,
      aiTasks: targetTasks.map((t) => mapTaskToAi(t, corridorMap.get(t.corridorId), deptMap.get(t.departmentId))),
      aiTrains: allTrains.map((tr) => mapTrainToAi(tr, corridorMap.get(tr.corridorId))),
      aiWindows: allWindows.map((w) => mapWindowToAi(w, corridorMap.get(w.corridorId))),
      aiResources: allResources.map((r) => mapResourceToAi(r)),
    };
  }

  private assertOrchestrationSuccess(aiResult: OrchestrationResult): void {
    if (aiResult.status === "FAILED" || aiResult.errors.length > 0) {
      throw new Error(`AI Orchestration Failure: ${aiResult.errors.join("; ") || "unknown engine failure"}`);
    }

    const opt = aiResult.optimization_result;
    if (!opt || !SUCCESSFUL_OPT_STATUSES.has(opt.status)) {
      throw new Error(`Optimization solver failure: ${opt?.status || "missing optimization result"}`);
    }
  }

  private async persistCriticalityScore(cs: CriticalityScore): Promise<void> {
    if (!cs.entity_id) return;
    await dataStore.updateTaskCriticality(cs.entity_id, cs.score || 0.5, cs.score ? (cs.score * 100).toFixed(1) : "50.0", cs);
  }

  private validateWhatIfScenario(payload: WhatIfScenarioPayload): WhatIfScenarioPayload {
    const scenarioType = ensureString(payload.scenario_type, "scenario_type") as WhatIfScenarioPayload["scenario_type"];
    const baseScheduleId = ensureString(payload.base_schedule_id, "base_schedule_id");

    // Reject magic strings — require a concrete persisted schedule ID
    if (baseScheduleId === "current" || baseScheduleId === "latest") {
      throw new ValidationError(
        `Invalid base_schedule_id '${baseScheduleId}'. ` +
        `Pass a concrete schedule_id, runId, or runCode from a completed planning run.`
      );
    }

    const newConstraints = payload.new_constraints;
    if (!newConstraints || typeof newConstraints !== "object" || Array.isArray(newConstraints)) {
      throw new ValidationError("Missing or invalid required field 'new_constraints'.");
    }

    if (scenarioType === "TRAIN_DELAY") {
      const affectedTrains = payload.affected_train_ids || [];
      if (affectedTrains.length === 0 && typeof newConstraints.train_id !== "string") {
        throw new ValidationError("TRAIN_DELAY requires affected_train_ids or new_constraints.train_id.");
      }
      ensureFiniteNumber(newConstraints.train_delay_minutes ?? newConstraints.delay_minutes, "new_constraints.train_delay_minutes");
    }

    if (scenarioType === "TASK_DURATION_CHANGED") {
      if (!payload.affected_task_ids?.length && typeof newConstraints.task_id !== "string") {
        throw new ValidationError("TASK_DURATION_CHANGED requires affected_task_ids or new_constraints.task_id.");
      }
      ensureFiniteNumber(newConstraints.new_duration_minutes ?? newConstraints.duration_minutes, "new_constraints.new_duration_minutes");
    }

    return { ...payload, scenario_type: scenarioType, base_schedule_id: baseScheduleId };
  }

  private validateEmergencyEvent(payload: EmergencyEventPayload): EmergencyEventPayload {
    const eventType = ensureString(payload.event_type, "event_type");
    const sectionId = ensureString(payload.section_id, "section_id");
    const severity = ensureString(payload.severity, "severity");
    const impactSummary = ensureString(payload.impact_summary, "impact_summary");
    const duration = ensureFiniteNumber(payload.estimated_duration_minutes, "estimated_duration_minutes");
    const fromKm = ensureFiniteNumber(payload.from_km, "from_km");
    const toKm = ensureFiniteNumber(payload.to_km, "to_km");
    if (duration <= 0) throw new ValidationError("'estimated_duration_minutes' must be greater than zero.");
    if (toKm < fromKm) throw new ValidationError("'to_km' must be greater than or equal to 'from_km'.");

    return {
      ...payload,
      event_type: eventType,
      section_id: sectionId,
      severity,
      impact_summary: impactSummary,
      estimated_duration_minutes: duration,
      from_km: fromKm,
      to_km: toKm,
    };
  }

  /**
   * Resolves planning context from current persisted data.
   *
   * Does NOT use volatile in-memory cache — always builds from the
   * authoritative data store to ensure consistency.
   */
  private async resolvePlanningContext(): Promise<PlanningContext> {
    const contextData = await this.buildPlanningContextData();
    return {
      request_id: `context_req_${Date.now().toString(36)}`,
      mode: "BALANCED",
      tasks: contextData.aiTasks,
      train_movements: contextData.aiTrains,
      resources: contextData.aiResources,
      maintenance_windows: contextData.aiWindows,
      constraints: {
        safety_rules: true,
        deadline_hard: true,
        resource_capacity: true,
      },
      weights: {
        maintenance_value: 0.45,
        shadow_block_benefit: 0.25,
        train_disruption_penalty: 0.3,
      },
      solver_settings: {
        max_runtime_seconds: 10,
        allow_partial_solution: true,
      },
    };
  }

  /**
   * Resolves the base schedule from authoritative persisted backend state.
   *
   * Looks up the provided base_schedule_id against persisted optimization
   * runs and reconstructs schedule candidates from persisted blocks.
   * Does NOT use volatile in-memory latestPlanningResult.
   * Does NOT accept "current" or "latest" as magic aliases.
   */
  private async resolveSchedule(baseScheduleId: string): Promise<{ schedule_candidates: ScheduleCandidate[] }> {
    // Look up in persisted optimization runs
    const runs = await dataStore.getOptimizationRuns();
    const matchingRun = runs.find(
      (run) => run.id === baseScheduleId || run.runId === baseScheduleId || run.runCode === baseScheduleId
    );

    if (!matchingRun) {
      throw new ValidationError(
        `Unknown base_schedule_id '${baseScheduleId}'. ` +
        `No persisted optimization run matches this ID. ` +
        `Run planning first and pass a returned runId or runCode.`
      );
    }

    // Reconstruct schedule candidates from the exact blocks of this optimization run
    const runBlocks = await dataStore.getBlocksByRun(
      matchingRun.id || matchingRun.runId || "",
      matchingRun.runCode
    );

    if (runBlocks.length === 0) {
      throw new ValidationError(
        `No persisted blocks found for optimization run '${baseScheduleId}'. Cannot reconstruct base schedule.`
      );
    }

    const candidates: ScheduleCandidate[] = runBlocks.map((block, index) => {
      const start = new Date(block.startAt).toISOString();
      const end = new Date(block.endAt).toISOString();
      const taskIds = Array.isArray(block.tasks)
        ? block.tasks
            .map((task: Record<string, unknown>) => (task.taskCode as string) || (task.id as string))
            .filter(Boolean) as string[]
        : [];
      return {
        schedule_id: index === 0 ? baseScheduleId : `${baseScheduleId}_${index + 1}`,
        task_ids: taskIds,
        blocks: [
          {
            block_id: (block.id || block.blockCode) as string,
            section_id: (block.corridorCode || block.corridorId) as string,
            start,
            end,
            durationMinutes: block.durationMinutes,
          },
        ],
        start_time: start,
        end_time: end,
        estimated_disruption_minutes: 0,
        resource_assignments: {},
        status: (block.status || "PROPOSED") as string,
      };
    });

    return { schedule_candidates: candidates };
  }
}

export const aiAdapter = new AiAdapterService();

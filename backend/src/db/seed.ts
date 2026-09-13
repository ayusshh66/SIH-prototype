import "dotenv/config";
import { db } from "./index";
import {
  departments,
  corridors,
  assets,
  defects,
  maintenanceTasks,
  trains,
  trainForecasts,
  blockWindows,
} from "./schema";
import { calculatePriorityScore } from "../modules/planning/priority.engine";

async function seed() {
  console.log("🌱 Starting railway block planning database seeding...");

  // 1. Departments
  console.log("1. Seeding Departments...");
  const [engDept] = await db
    .insert(departments)
    .values({
      code: "ENG",
      name: "Civil Engineering & Permanent Way",
    })
    .onConflictDoNothing()
    .returning();

  const [trdDept] = await db
    .insert(departments)
    .values({
      code: "TRD",
      name: "Traction Distribution & OHE",
    })
    .onConflictDoNothing()
    .returning();

  const [sntDept] = await db
    .insert(departments)
    .values({
      code: "SNT",
      name: "Signal & Telecommunication",
    })
    .onConflictDoNothing()
    .returning();

  // Retrieve actual department rows
  const allDepts = await db.select().from(departments);
  const engId = allDepts.find((d) => d.code === "ENG")!.id;
  const trdId = allDepts.find((d) => d.code === "TRD")!.id;
  const sntId = allDepts.find((d) => d.code === "SNT")!.id;

  // 2. Corridors
  console.log("2. Seeding Corridors...");
  await db
    .insert(corridors)
    .values([
      {
        code: "NDLS-AGC",
        name: "New Delhi to Agra Cantt High Density Network",
        zone: "Northern Railway",
        division: "Delhi",
        startKm: "0.000",
        endKm: "195.000",
        status: "ACTIVE",
      },
      {
        code: "AGC-GWL",
        name: "Agra Cantt to Gwalior Junction Section",
        zone: "North Central Railway",
        division: "Agra",
        startKm: "195.000",
        endKm: "314.000",
        status: "ACTIVE",
      },
    ])
    .onConflictDoNothing();

  const allCorrs = await db.select().from(corridors);
  const ndlsAgcId = allCorrs.find((c) => c.code === "NDLS-AGC")!.id;
  const agcGwlId = allCorrs.find((c) => c.code === "AGC-GWL")!.id;

  // 3. Assets
  console.log("3. Seeding Railway Assets...");
  await db
    .insert(assets)
    .values([
      {
        assetCode: "AST-TRK-NDLS-045",
        assetType: "Continuous Welded Rail (60kg UIC)",
        departmentId: engId,
        corridorId: ndlsAgcId,
        locationKm: "45.500",
        criticalityScore: 85,
        safetyScore: 90,
        healthScore: 72,
        status: "DEGRADED",
      },
      {
        assetCode: "AST-OHE-NDLS-128",
        assetType: "25kV AC Catenary Contact Wire",
        departmentId: trdId,
        corridorId: ndlsAgcId,
        locationKm: "46.100",
        criticalityScore: 80,
        safetyScore: 85,
        healthScore: 68,
        status: "DEGRADED",
      },
      {
        assetCode: "AST-SNT-NDLS-P102",
        assetType: "Point Machine & Ground Interlocking 102A",
        departmentId: sntId,
        corridorId: ndlsAgcId,
        locationKm: "45.200",
        criticalityScore: 90,
        safetyScore: 95,
        healthScore: 65,
        status: "UNDER_MAINTENANCE",
      },
      {
        assetCode: "AST-TRK-GWL-212",
        assetType: "Diamond Crossing Special Layout DX-15",
        departmentId: engId,
        corridorId: agcGwlId,
        locationKm: "212.400",
        criticalityScore: 88,
        safetyScore: 90,
        healthScore: 75,
        status: "ACTIVE",
      },
    ])
    .onConflictDoNothing();

  const allAssets = await db.select().from(assets);
  const trackAsset = allAssets.find((a) => a.assetCode === "AST-TRK-NDLS-045")!;
  const oheAsset = allAssets.find((a) => a.assetCode === "AST-OHE-NDLS-128")!;
  const pointAsset = allAssets.find((a) => a.assetCode === "AST-SNT-NDLS-P102")!;

  // 4. Defects
  console.log("4. Seeding Defects...");
  if (trackAsset && oheAsset && pointAsset) {
    await db
      .insert(defects)
      .values([
        {
          defectCode: "DEF-NDLS-001",
          assetId: trackAsset.id,
          corridorId: ndlsAgcId,
          severity: "HIGH",
          description: "Micro-fissure detected on outer rail head at KM 45.500",
          safetyImpact: 85,
          operationalImpact: 70,
          dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          defectCode: "DEF-NDLS-002",
          assetId: oheAsset.id,
          corridorId: ndlsAgcId,
          severity: "MEDIUM",
          description: "OHE tension dropper looseness between masts 46/10 and 46/14",
          safetyImpact: 75,
          operationalImpact: 60,
          dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        },
        {
          defectCode: "DEF-NDLS-003",
          assetId: pointAsset.id,
          corridorId: ndlsAgcId,
          severity: "HIGH",
          description: "Throw bar timing delay > 4.5 seconds on point machine 102A",
          safetyImpact: 90,
          operationalImpact: 85,
          dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        },
      ])
      .onConflictDoNothing();
  }

  const allDefects = await db.select().from(defects);
  const trackDefect = allDefects.find((d) => d.defectCode === "DEF-NDLS-001");
  const oheDefect = allDefects.find((d) => d.defectCode === "DEF-NDLS-002");
  const pointDefect = allDefects.find((d) => d.defectCode === "DEF-NDLS-003");

  // 5. Maintenance Tasks
  console.log("5. Seeding Maintenance Tasks...");
  if (trackAsset && oheAsset && pointAsset) {
    const rawTasks = [
      {
        taskCode: "TSK-ENG-445",
        assetId: trackAsset.id,
        departmentId: engId,
        corridorId: ndlsAgcId,
        defectId: trackDefect?.id,
        taskType: "DEFECT_REPAIR" as const,
        description: "Rail grinding and thermite weld repair at KM 45.500",
        locationStartKm: "45.000",
        locationEndKm: "46.000",
        criticalityScore: 85,
        urgencyScore: 85,
        safetyScore: 90,
        operationalImpactScore: 75,
        estimatedDurationMinutes: 120,
        overdueDays: 2,
        requiredBlock: true,
        requiresPowerShutdown: false,
      },
      {
        taskCode: "TSK-TRD-461",
        assetId: oheAsset.id,
        departmentId: trdId,
        corridorId: ndlsAgcId,
        defectId: oheDefect?.id,
        taskType: "CORRECTIVE" as const,
        description: "Overhead contact wire re-tensioning & dropper realignment",
        locationStartKm: "45.500",
        locationEndKm: "46.500",
        criticalityScore: 80,
        urgencyScore: 75,
        safetyScore: 80,
        operationalImpactScore: 65,
        estimatedDurationMinutes: 120,
        overdueDays: 1,
        requiredBlock: true,
        requiresPowerShutdown: true,
      },
      {
        taskCode: "TSK-SNT-102",
        assetId: pointAsset.id,
        departmentId: sntId,
        corridorId: ndlsAgcId,
        defectId: pointDefect?.id,
        taskType: "DEFECT_REPAIR" as const,
        description: "Point machine 102A gear overhaul & sensor recalibration",
        locationStartKm: "45.100",
        locationEndKm: "45.300",
        criticalityScore: 90,
        urgencyScore: 90,
        safetyScore: 95,
        operationalImpactScore: 85,
        estimatedDurationMinutes: 90,
        overdueDays: 3,
        requiredBlock: true,
        requiresPowerShutdown: false,
      },
      {
        taskCode: "TSK-ENG-490",
        assetId: trackAsset.id,
        departmentId: engId,
        corridorId: ndlsAgcId,
        taskType: "PREVENTIVE" as const,
        description: "Ballast tamping and alignment adjustment KM 48 - 52",
        locationStartKm: "48.000",
        locationEndKm: "52.000",
        criticalityScore: 70,
        urgencyScore: 60,
        safetyScore: 65,
        operationalImpactScore: 50,
        estimatedDurationMinutes: 150,
        overdueDays: 0,
        requiredBlock: true,
        requiresPowerShutdown: false,
      },
    ];

    for (const t of rawTasks) {
      const score = calculatePriorityScore({
        criticalityScore: t.criticalityScore,
        urgencyScore: t.urgencyScore,
        safetyScore: t.safetyScore,
        operationalImpactScore: t.operationalImpactScore,
        overdueDays: t.overdueDays,
        taskType: t.taskType,
        defectSeverity: "HIGH",
        requiresPowerShutdown: t.requiresPowerShutdown,
      });

      await db
        .insert(maintenanceTasks)
        .values({
          ...t,
          priorityScore: String(score),
          status: "PENDING",
        })
        .onConflictDoNothing();
    }
  }

  // 6. Scheduled Trains
  console.log("6. Seeding Scheduled Trains...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const t1Arr = new Date(tomorrow);
  t1Arr.setHours(6, 0, 0, 0);
  const t1Dep = new Date(tomorrow);
  t1Dep.setHours(7, 45, 0, 0);

  const t2Arr = new Date(tomorrow);
  t2Arr.setHours(8, 30, 0, 0);
  const t2Dep = new Date(tomorrow);
  t2Dep.setHours(10, 15, 0, 0);

  const t3Arr = new Date(tomorrow);
  t3Arr.setHours(13, 0, 0, 0);
  const t3Dep = new Date(tomorrow);
  t3Dep.setHours(16, 0, 0, 0);

  await db
    .insert(trains)
    .values([
      {
        trainNumber: "20172",
        trainName: "Vande Bharat Express (NDLS - AGC)",
        trainType: "EXPRESS",
        corridorId: ndlsAgcId,
        scheduledArrival: t1Arr,
        scheduledDeparture: t1Dep,
        priority: 95,
        isCriticalService: true,
        status: "SCHEDULED",
      },
      {
        trainNumber: "12002",
        trainName: "Bhopal Shatabdi Express",
        trainType: "EXPRESS",
        corridorId: ndlsAgcId,
        scheduledArrival: t2Arr,
        scheduledDeparture: t2Dep,
        priority: 90,
        isCriticalService: true,
        status: "SCHEDULED",
      },
      {
        trainNumber: "BTPN-554",
        trainName: "IOCL Petroleum Tanker Rake",
        trainType: "GOODS",
        corridorId: ndlsAgcId,
        scheduledArrival: t3Arr,
        scheduledDeparture: t3Dep,
        priority: 45,
        isGoodsTrain: true,
        status: "SCHEDULED",
      },
    ])
    .onConflictDoNothing();

  // 7. Block Windows
  console.log("7. Seeding Block Windows (from COA)...");
  const win1Start = new Date(tomorrow);
  win1Start.setHours(1, 30, 0, 0); // 01:30 AM
  const win1End = new Date(tomorrow);
  win1End.setHours(4, 30, 0, 0); // 04:30 AM (180 mins)

  const win2Start = new Date(tomorrow);
  win2Start.setHours(11, 0, 0, 0); // 11:00 AM
  const win2End = new Date(tomorrow);
  win2End.setHours(13, 0, 0, 0); // 13:00 PM (120 mins)

  await db
    .insert(blockWindows)
    .values([
      {
        corridorId: ndlsAgcId,
        startAt: win1Start,
        endAt: win1End,
        availableMinutes: 180,
        source: "COA",
        status: "AVAILABLE",
      },
      {
        corridorId: ndlsAgcId,
        startAt: win2Start,
        endAt: win2End,
        availableMinutes: 120,
        source: "COA",
        status: "AVAILABLE",
      },
    ])
    .onConflictDoNothing();

  // 8. Train Forecasts
  console.log("8. Seeding Train Forecasts...");
  await db
    .insert(trainForecasts)
    .values([
      {
        corridorId: ndlsAgcId,
        forecastDate: tomorrow,
        timeWindowStart: win1Start,
        timeWindowEnd: win1End,
        expectedTrainCount: 0,
        congestionLevel: "LOW",
        confidenceScore: "95.50",
      },
      {
        corridorId: ndlsAgcId,
        forecastDate: tomorrow,
        timeWindowStart: t1Arr,
        timeWindowEnd: t2Dep,
        expectedTrainCount: 8,
        congestionLevel: "HIGH",
        confidenceScore: "92.00",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Railway Block Planning database seeded successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });

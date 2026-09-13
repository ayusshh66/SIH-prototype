import type {
  Corridor,
  KpiMetric,
  ConflictItem,
  TrainImpactItem,
} from '@/types/domain';

export const SAMPLE_CORRIDORS: Corridor[] = [
  {
    id: 'c01a-ndls-agc',
    code: 'NDLS-AGC',
    name: 'New Delhi to Agra Cantt High Density Network',
    zone: 'Northern Railway',
    division: 'Delhi',
    startKm: 0.0,
    endKm: 195.0,
    status: 'ACTIVE',
  },
  {
    id: 'c02b-agc-gwl',
    code: 'AGC-GWL',
    name: 'Agra Cantt to Gwalior Junction Section',
    zone: 'North Central Railway',
    division: 'Agra',
    startKm: 195.0,
    endKm: 314.0,
    status: 'ACTIVE',
  },
];

export const SAMPLE_KPIS: KpiMetric[] = [
  {
    id: 'kpi-p1',
    label: 'Critical Tasks (P1)',
    value: 4,
    subtext: '+1 Urgent Rail Defect',
    status: 'critical',
  },
  {
    id: 'kpi-p2',
    label: 'High Priority (P2)',
    value: 11,
    subtext: '5 TRD · 6 S&T Items',
    status: 'warning',
  },
  {
    id: 'kpi-blocks',
    label: 'Active Blocks',
    value: 6,
    subtext: '3 Executing · 3 Approved',
    status: 'optimal',
  },
  {
    id: 'kpi-savings',
    label: 'Possession Hours Saved',
    value: '3.5 hrs',
    subtext: '210 Mins Total Compression',
    status: 'optimal',
  },
];

export const SAMPLE_CONFLICTS: ConflictItem[] = [
  {
    id: 'conf-101',
    type: 'TRAIN_CONFLICT',
    severity: 'HIGH',
    title: 'Block Overlaps Express Path',
    description: 'Proposed possession at Km 45.2 overlaps Train 12002 Shatabdi Express scheduled slot.',
    affectedEntityId: 'TSK-ENG-NDLS-045-01',
    sectionId: 'NDLS-AGC (Km 45.2)',
    timestamp: '2026-11-03T23:45:00Z',
  },
  {
    id: 'conf-102',
    type: 'RESOURCE_CONFLICT',
    severity: 'CRITICAL',
    title: 'Dual Allocation of USFD Testing Vehicle',
    description: 'USFD vehicle V-12 is scheduled concurrently for two disparate track sections.',
    affectedEntityId: 'RES-VEH-12',
    sectionId: 'NDLS-AGC (Km 134.2)',
    timestamp: '2026-11-04T01:00:00Z',
  },
  {
    id: 'conf-103',
    type: 'SAFETY_CONFLICT',
    severity: 'CRITICAL',
    title: 'Interlocking Clearance Rule Violation',
    description: 'S&T point sensor calibration cannot co-occur with mechanical tamping under IR-SIG-402.',
    affectedEntityId: 'TSK-SNT-NDLS-089',
    sectionId: 'NDLS-AGC (Km 88.4)',
    timestamp: '2026-11-04T02:30:00Z',
  },
];

export const SAMPLE_TRAIN_IMPACT: TrainImpactItem[] = [
  {
    trainNumber: '22436',
    trainName: 'Vande Bharat Express',
    trainType: 'EXPRESS',
    speedClass: 'EXPRESS',
    delayMinutes: 0,
    impactLevel: 'NONE',
    affectedSection: 'NDLS - AGC',
  },
  {
    trainNumber: '12002',
    trainName: 'Bhopal Shatabdi',
    trainType: 'EXPRESS',
    speedClass: 'HIGH',
    delayMinutes: 15,
    impactLevel: 'MEDIUM',
    affectedSection: 'NDLS - AGC (Km 45.2)',
  },
  {
    trainNumber: 'BOXN-402',
    trainName: 'Coal Rake Freight',
    trainType: 'GOODS',
    speedClass: 'LOW',
    delayMinutes: 45,
    impactLevel: 'LOW',
    affectedSection: 'Palwal Goods Loop',
  },
];

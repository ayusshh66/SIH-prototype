export const DEFAULT_PLANNING_HORIZON_WEEKS = 10;
export const STRATEGIC_26_WEEK_HORIZON_WEEKS = 26;
export const JPO_WINDOW_DAYS = 70;

export const PLANNING_HORIZON_OPTIONS = Object.freeze([
  'WEEKLY',
  'MONTHLY',
  'STRATEGIC_26_WEEK',
]);

export function getBlockJpoStatus(block = {}, referenceDate = new Date()) {
  const explicitViolation = block.isJpoViolation ?? block.is_jpo_violation;
  if (typeof explicitViolation === 'boolean') {
    return explicitViolation ? 'JPO_VIOLATION' : 'JPO_COMPLIANT';
  }

  const requiresTrafficBlock =
    block.requiresTrafficBlock ?? block.requires_traffic_block ?? false;

  if (!requiresTrafficBlock) {
    return 'JPO_COMPLIANT';
  }

  const startValue = block.startAt ?? block.start_date ?? block.startDate;
  if (!startValue) {
    return 'JPO_COMPLIANT';
  }

  const start = new Date(startValue);
  const threshold = new Date(referenceDate.getTime() + JPO_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return start < threshold ? 'JPO_VIOLATION' : 'JPO_COMPLIANT';
}

export function getStrategicPlanningWindow(referenceDate = new Date()) {
  const anchor = new Date(referenceDate);
  const weeks = [];

  for (let index = 0; index < STRATEGIC_26_WEEK_HORIZON_WEEKS; index += 1) {
    const start = new Date(anchor);
    start.setUTCDate(anchor.getUTCDate() + index * 7);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    weeks.push({
      index,
      label: `W${index + 1}`,
      start,
      end,
      isoStart: start.toISOString(),
      isoEnd: end.toISOString(),
    });
  }

  return weeks;
}

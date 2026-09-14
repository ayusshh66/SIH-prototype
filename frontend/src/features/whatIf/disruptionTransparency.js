export function buildDisruptionTransparency(source) {
  if (!source || typeof source !== 'object') {
    return {
      status: 'unavailable',
      delayLabel: 'Impact data unavailable',
      affectedTrains: [],
      delayMinutes: null,
      sectionLabel: 'N/A',
      timeLabel: 'N/A',
      reason: 'Impact data unavailable',
      message: 'Impact data unavailable',
      blockLabel: 'Unknown maintenance block',
    };
  }

  const affectedTrains = Array.isArray(source.affected_trains)
    ? source.affected_trains.filter(Boolean)
    : Array.isArray(source.affected_train_ids)
      ? source.affected_train_ids.filter(Boolean)
      : [];

  const schedule = source.new_schedule ?? source.schedule ?? null;
  const block = Array.isArray(schedule?.blocks) && schedule.blocks.length > 0 ? schedule.blocks[0] : null;
  const blockLabel = block?.block_id || source.block_id || source.blockCode || source.block_code || 'Maintenance Block';
  const sectionLabel = block?.section_id || source.section_id || source.sectionId || 'maintenance corridor';

  const delayMinutesValue =
    source?.new_schedule?.estimated_disruption_minutes ??
    source?.estimated_disruption_minutes ??
    source?.metric_differences?.train_disruption_minutes ??
    0;

  const delayMinutes = Number(delayMinutesValue);
  const hasExplicitActualDelay = Number.isFinite(source?.actual_live_delay_minutes) || Number.isFinite(source?.actualDelayMinutes);
  const delayLabel = hasExplicitActualDelay ? 'Actual / live delay' : 'Estimated / planned impact';

  const timeLabel = block
    ? `${new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → ${new Date(block.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : source.time_window || 'Time window unavailable';

  const reason = source.explanation || 'Maintenance block in planned possession window.';

  if (!affectedTrains.length && !delayMinutes) {
    return {
      status: 'none',
      delayLabel,
      affectedTrains: [],
      delayMinutes: 0,
      sectionLabel,
      timeLabel,
      reason,
      message: 'No train disruption detected',
      blockLabel,
    };
  }

  const trainText = affectedTrains.length > 1 ? affectedTrains.join(', ') : affectedTrains[0] || 'Affected train';
  const sentence = `Train ${trainText} may be delayed by approximately ${delayMinutes} minutes due to maintenance block on ${sectionLabel}.`;

  return {
    status: 'affected',
    delayLabel,
    affectedTrains,
    delayMinutes,
    sectionLabel,
    timeLabel,
    reason,
    message: sentence,
    blockLabel,
  };
}

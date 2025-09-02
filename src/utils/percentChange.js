// Utility to compute percentage change label per business rules
// Rules:
// - If previous === 0 and current === 0 -> '0%'
// - If previous === 0 and current > 0 -> '+100%'
// - Else percent = ((current - previous) / previous) * 100
//   Format with sign (+/-) and up to 1 decimal, trim trailing .0
export function percentChangeLabel(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0) {
    if (cur === 0) return '0%';
    return '+100%';
  }

  const raw = ((cur - prev) / prev) * 100;
  // Round to 1 decimal but avoid -0
  let rounded = Math.round(raw * 10) / 10;
  if (Object.is(rounded, -0)) rounded = 0;

  // Format with + sign for non-negative
  const sign = rounded >= 0 ? '+' : '-';
  // Show integer if .0
  const absVal = Math.abs(rounded);
  const valueStr = Number.isInteger(absVal) ? String(absVal) : absVal.toFixed(1);
  return `${sign}${valueStr}%`;
}

export default percentChangeLabel;

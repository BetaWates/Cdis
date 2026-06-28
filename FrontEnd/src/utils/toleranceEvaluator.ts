/**
 * Evaluates a measured value against a standard value + tolerance string.
 * Pure function — no side effects. Extracted from DailyChecksView for reuse.
 *
 * Supported tolerance formats:
 *   MAX | MIN | <N | >N | ±N | N (symmetric) | +N/-M (asymmetric)
 */
export function evaluateStatus(
  value: string,
  standardValue: string,
  tolerance: string
): 'OK' | 'NG' | '--' {
  if (!value.trim() || isNaN(Number(value))) return '--';
  const num = Number(value);

  const tolLower = tolerance.toLowerCase();

  // Handle MAX / MIN / pure MAX tolerances like "MAX", "MIN", "< 0.8"
  if (tolLower === 'max' || tolLower.startsWith('max')) {
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num <= std ? 'OK' : 'NG';
  }
  if (tolLower === 'min' || tolLower.startsWith('min')) {
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num >= std ? 'OK' : 'NG';
  }
  if (tolLower.startsWith('<')) {
    const limit = parseFloat(tolLower.replace('<', '').trim());
    return num < limit ? 'OK' : 'NG';
  }
  if (tolLower.startsWith('>')) {
    const limit = parseFloat(tolLower.replace('>', '').trim());
    return num > limit ? 'OK' : 'NG';
  }

  // Handle ±0.05 symmetric
  const symMatch = tolerance.match(/^[±+\-]?([\d.]+)$/);
  if (symMatch) {
    const tol = parseFloat(symMatch[1]);
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return Math.abs(num - std) <= tol ? 'OK' : 'NG';
  }

  // Handle +0.05 / -0.02 asymmetric
  const asymMatch = tolerance.match(/[+]([\d.]+)\s*\/??\s*-?([\d.]+)/);
  if (asymMatch) {
    const upper = parseFloat(asymMatch[1]);
    const lower = parseFloat(asymMatch[2]);
    const std = parseFloat(standardValue);
    if (isNaN(std)) return '--';
    return num >= std - lower && num <= std + upper ? 'OK' : 'NG';
  }

  return '--';
}

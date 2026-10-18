/** SAR amounts with thousands separators, no decimals unless needed. */
export function formatSAR(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

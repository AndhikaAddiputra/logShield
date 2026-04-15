export function formatQuantity(n: number, locale = "id-ID"): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

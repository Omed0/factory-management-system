import { formatCurrency } from "~/lib/utils";

/**
 * Convert an IQD-denominated amount to the display currency and format it.
 * All monetary values are stored in IQD; this function handles the display-side conversion.
 */
export function formatMoney(
  iqdAmount: number,
  currency: string,
  dollarRate: number,
): string {
  if (currency === "USD" && dollarRate > 0) {
    return formatCurrency(iqdAmount / dollarRate, "USD");
  }
  return formatCurrency(iqdAmount, "IQD");
}

/**
 * Per-record USD display: each transactional row snapshots `dollar` (the IQD/USD rate
 * at fill-time). For list/detail rows, use that snapshot so historical figures stay
 * stable when the current rate changes. Falls back to `fallbackDollar` (the global
 * current rate) when a row was created before the snapshot existed.
 */
export function formatRecordMoney(
  iqdAmount: number,
  currency: string,
  recordDollar: number | null | undefined,
  fallbackDollar: number,
): string {
  const rate = recordDollar && recordDollar > 0 ? recordDollar : fallbackDollar;
  return formatMoney(iqdAmount, currency, rate);
}

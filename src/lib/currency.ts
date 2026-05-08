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

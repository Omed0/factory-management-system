import { formatMoney } from "~/lib/currency";

interface MoneyProps {
  amount: number;
  currency?: string;
  dollarRate?: number;
  className?: string;
}

export function Money({ amount, currency = "IQD", dollarRate = 1, className }: MoneyProps) {
  return <span className={className}>{formatMoney(amount, currency, dollarRate)}</span>;
}

import { useMemo } from 'react';

import { useDollar } from './useDollar';
import useSetQuery from './useSetQuery';

import { formatCurrency } from '@/lib/utils';

export default function useConvertCurrency(amount: number) {
  const {
    data: { dollar },
  } = useDollar();
  const { searchParams } = useSetQuery();

  const currency = searchParams.get('currency') || 'USD';

  const convertedAmount = useMemo(() => {
    return formatCurrency(amount, dollar, currency);
  }, [amount, dollar, currency]);

  return convertedAmount;
}

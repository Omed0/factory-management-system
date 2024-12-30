import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import useSetQuery from '@/hooks/useSetQuery';

export default function ChangeCurrency() {
  const { setQuery, searchParams } = useSetQuery(0);
  const currentCurrency = searchParams.get('currency') || 'USD';

  const handleChangeCurrency = useCallback((currency: "IQD" | "USD") => {
    if (currency !== currentCurrency) {
      setQuery('currency', currency)
    }
  }, [currentCurrency, setQuery])

  return (
    <Select
      value={currentCurrency}
      onValueChange={handleChangeCurrency}
    >
      <SelectTrigger className="h-9 w-32 gap-3">
        <SelectValue placeholder={currentCurrency || 'جۆری پارە'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">دۆلار</SelectItem>
        <SelectItem value="IQD">دینار</SelectItem>
      </SelectContent>
    </Select>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import useSetQuery from '@/hooks/useSetQuery';

export default function ChangeCurrency() {
  const { setQuery, searchParams } = useSetQuery();
  const currentCurrency = searchParams.get('currency') || 'USD';

  return (
    <Select
      defaultValue={currentCurrency}
      onValueChange={(currency) => setQuery('currency', currency)}
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

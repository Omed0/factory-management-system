import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import useSetQuery from '@/hooks/useSetQuery';
import { months } from '@/lib/constant';

export default function MonthSelector() {
  const now = new Date();
  const { searchParams, setQuery } = useSetQuery(50);
  const currentMonth = searchParams.get('month');

  return (
    <Select
      defaultValue={currentMonth || (now.getMonth() + 1).toString()}
      onValueChange={(month) => setQuery('month', month)}
    >
      <SelectTrigger className="h-8 w-fit gap-6">
        <SelectValue placeholder={currentMonth || 'مانگێک هەڵبژێرە'} />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem value={m.value.toString()} key={m.name}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

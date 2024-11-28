import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import useSetQuery from '@/hooks/useSetQuery'

type Props = {}

export default function ChangeCurrency({ }: Props) {
    const { setQuery, searchParams } = useSetQuery()
    const currentCurrency = searchParams.get("currency") || "USD"

    return (
        <Select
            defaultValue={currentCurrency}
            onValueChange={(currency) => setQuery("currency", currency)}
        >
            <SelectTrigger className="w-32 gap-3 h-9">
                <SelectValue placeholder={currentCurrency || "جۆری پارە"} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="USD">دۆلار</SelectItem>
                <SelectItem value="IQD">دینار</SelectItem>
            </SelectContent>
        </Select>
    )
}
import useSetQuery from "@/hooks/useSetQuery"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { months } from "@/lib/constant"

type Props = {}

export default function MonthSelector({ }: Props) {
    const now = new Date()
    const { searchParams, setQuery } = useSetQuery(50)
    const currentMonth = searchParams.get("month")

    return (
        <Select
            defaultValue={currentMonth || (now.getMonth() + 1).toString()}
            onValueChange={(month) => setQuery("month", month)}
        >
            <SelectTrigger className="w-fit gap-6 h-8">
                <SelectValue placeholder={currentMonth || "مانگێک هەڵبژێرە"} />
            </SelectTrigger>
            <SelectContent>
                {months.map((m) => (
                    <SelectItem value={m.value.toString()}>{m.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
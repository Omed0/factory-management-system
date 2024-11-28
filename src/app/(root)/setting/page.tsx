import { getDollarActions } from "@/actions/boxes"
import { ThemeSwitcher } from "@/components/theme-switcher"
import FormDollar from "./_component/form-dollar"

type Props = {}

export default async function Setting({ }: Props) {

    const { success, data, message } = await getDollarActions()

    if (!success) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{message}</h1>
            </div>
        </div>
    }

    return (
        <section dir="ltr" className="flex-1 space-y-4 p-2 flex gap-4">
            <div className="p-8 border-r-2 w-fit">
                <ThemeSwitcher className="" />
            </div>
            <div className="w-full p-4 space-y-2">
                <div className="p-2 rounded border flex items-center justify-between gap-4">
                    <p>
                        {Number(data?.dollar) * 100}
                    </p>
                    <p> : نرخی دۆلار</p>
                </div>
                <FormDollar />
            </div>
        </section>
    )
}
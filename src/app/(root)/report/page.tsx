import { DataTable } from "./_component/data-table"
import { columns } from "./_component/columns"

type Props = {}

export default function Report({ }: Props) {

    const reports = [{}]

    //if (!reports.success) {
    //    return <div className="w-full h-full flex items-center justify-center">
    //        <div className="flex flex-col items-center justify-center gap-2">
    //            <h1 className="text-lg font-medium">{reports.message}</h1>
    //        </div>
    //    </div>
    //}

    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex items-center gap-2">
                {/*<h1 className="text-lg font-medium">
                    {isTrash ? "مەوادە ئەرشیفکراوەکان" : "مەوادە بەردەستەکان"}
                </h1>*/}
            </div>
            <DataTable
                columns={columns}
                data={reports}
            />
        </section>
    )
}
import { Table } from "@tanstack/react-table";
import { useEffect } from "react";
import useSetQuery from "./useSetQuery";



export default function useInputSetQuery<TData>(query: string, name: string, table: Table<TData>) {
    const { searchParams } = useSetQuery()
    const invoice = searchParams.get(query);

    useEffect(() => {
        if (invoice) {
            table.getColumn(name)?.setFilterValue(invoice);
        }
        return () => table.getColumn(name)?.setFilterValue('');
    }, [invoice, table]);

    return {
        searchParams
    }
}
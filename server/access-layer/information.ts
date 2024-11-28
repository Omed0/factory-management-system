import { tryCatch } from "@/lib/helper"
import "server-only"
import { getReportByDateSchema, ReportDateTypes } from "../schema/information"
import { prisma } from "@/lib/client"

export async function getExpensesListActionsSpecificTime(data: ReportDateTypes) {
    return tryCatch(async () => {
        const formated = getReportByDateSchema.parse(data)

        const expenses = await prisma.expenses.findMany({
            where: {
                created_at: { gte: formated.startOfMonth, lte: formated.endOfMonth },
                deleted_at: null
            }
        })
        return expenses
    })
}


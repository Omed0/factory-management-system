import { z } from "zod";

enum reports {
    expense = "expense",
    sale = "sale",
    purchase = "purchase"
}

export const getReportByDateSchema = z.object({
    name: z.nativeEnum(reports),
    startOfMonth: z.string().refine(value => !isNaN(Date.parse(value)), {
        message: "Invalid ISO date format for startOfMonth",
    }),
    endOfMonth: z.string().refine(value => !isNaN(Date.parse(value)), {
        message: "Invalid ISO date format for endOfMonth",
    }),
});

export type ReportDateTypes = z.infer<typeof getReportByDateSchema>
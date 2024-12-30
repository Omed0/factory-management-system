export const keyExpense = {
    id: "id",
    title: "name",
    amount: "amount",
    created_at: "date",
    note: "note",
    dollar: "dollar"
}

export const keySale = {
    id: "id",
    type: "type",
    saleNumber: "name",
    totalRemaining: "amount",
    customerId: "redirectId",
    saleDate: "date",
    note: "note",
    dollar: "dollar"
};

export const keyPurchase = {
    id: "id",
    name: "name",
    type: "type",
    totalRemaining: "amount",
    companyId: "redirectId",
    purchaseDate: "date",
    note: "note",
    dollar: "dollar"
}

export const report_name = ["expense", "sale", "purchase"] as const;

export type ReportName = typeof report_name[number];

export const tr_report_name = [
    { name: report_name[0], value: "خەرجی" },
    { name: report_name[1], value: "فرۆشتن" },
    { name: report_name[2], value: "کڕین" },
]

export const report_link = [
    { name: report_name[0], value: (id: string) => `/expense` },
    { name: report_name[1], value: (id: string) => `/customer/${id}` },
    { name: report_name[2], value: (id: string) => `/company/${id}` },
]
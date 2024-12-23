import { z } from 'zod';
import { Companies, Customers } from "@prisma/client";

enum reports {
  expense = 'expense',
  sale = 'sale',
  purchase = 'purchase',
}

export const getDashboardInfoSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getReportByDateSchema = z.object({
  name: z.nativeEnum(reports),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getReportPersonByDateSchema = z.object({
  name: z.nativeEnum(reports),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getReportProductByDateSchema = z.object({
  name: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getTradePartnerSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["company", "customer"])
});

export type DashboardInfoTypes = z.infer<typeof getDashboardInfoSchema>;
export type ReportDateTypes = z.infer<typeof getReportByDateSchema>;
export type ReportPersonTypes = z.infer<typeof getReportPersonByDateSchema>;
export type ReportProductTypes = z.infer<typeof getReportProductByDateSchema>;
export type TradePartnerTypes = z.infer<typeof getTradePartnerSchema>;


export type TradePartner = Companies | Customers;

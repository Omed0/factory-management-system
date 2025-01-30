import { z } from 'zod';
import { Companies, Customers } from '@prisma/client';

enum reports {
  expense = 'expense',
  sale = 'sale',
  purchase = 'purchase',
}

const partners = z.enum(['customer', 'company']);

export const getDashboardInfoSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getReportByDateSchema = z.object({
  name: z.nativeEnum(reports),
  from: z.string(),
  to: z.string(),
});

export const getReportPersonByDateSchema = z.object({
  name: z.nativeEnum(reports),
  from: z.string(),
  to: z.string(),
});

export const getTradePartnerSchema = z.object({
  type: partners,
});

export const getReportTradePartnerSchema = z.object({
  type: partners,
  id: z.string(),
  dates: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const getReportChartPartnerSchema = z.object({
  type: partners,
  id: z.string(),
});

export const getInfoAboutBoxSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getActionsEmployeeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  name: z.string().optional(),
});

export const getPartnersLoanSchema = z.object({
  type: partners,
});

export const getSelfInvoiceSchema = z.object({
  type: partners,
  isTrash: z.boolean().optional(),
  dates: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export type DashboardInfoTypes = z.infer<typeof getDashboardInfoSchema>;
export type ReportDateTypes = z.infer<typeof getReportByDateSchema>;
export type ReportPersonTypes = z.infer<typeof getReportPersonByDateSchema>;
export type TradePartnerTypes = z.infer<typeof getTradePartnerSchema>;
export type ReportTradePartnerTypes = z.infer<
  typeof getReportTradePartnerSchema
>;
export type getReportChartPartnerTypes = z.infer<
  typeof getReportChartPartnerSchema
>;
export type InfoAboutBoxTypes = z.infer<typeof getInfoAboutBoxSchema>;
export type PartnersLoanTypes = z.infer<typeof getPartnersLoanSchema>;
export type getActionsEmployeeTypes = z.infer<typeof getActionsEmployeeSchema>;
export type getSelfInvoiceTypes = z.infer<typeof getSelfInvoiceSchema>;

export type TradePartner = Companies | Customers;

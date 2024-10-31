import { Boxes } from "@prisma/client";
import { z } from "zod";

export type CreateBox = z.infer<typeof createBoxSchema>;
export type GetOneBox = z.infer<typeof getOneBoxSchema>;
export type UpdateBox = z.infer<typeof updateBoxSchema>;
export type OneBox = Boxes;
export type ListBox = Boxes[];


export const createBoxSchema = z.object({
    amount: z.number(),
});

export const getOneBoxSchema = z.object({
    id: z.number(),
});

export const updateBoxSchema = z.object({
    id: z.number(),
    amount: z.number(),
});


import { Products, UnitType } from "@prisma/client";
import { z } from "zod";




export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type DeleteProduct = z.infer<typeof deleteProductSchema>;
export type GetOneProduct = z.infer<typeof getProductSchema>;
export type DeleteManyProduct = z.infer<typeof deleteManyProductSchema>;
export type OneProduct = Products
export type ListProduct = Products[]

export const createProductSchema = z.object({
    name: z.string().min(1).max(255),
    price: z.number().positive(),
    image: z.any().nullable().optional(),
    unitType: z.nativeEnum(UnitType),
});

export const updateProductSchema = createProductSchema.partial().and(z.object({ id: z.number().positive() }));
export const deleteProductSchema = z.object({ id: z.number().int().positive() });
export const getProductSchema = z.object({ id: z.number().int().positive() });

export const deleteManyProductSchema = z.object({ ids: z.array(z.number().int().positive()) });

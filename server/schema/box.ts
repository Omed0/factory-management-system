import { z } from 'zod';

export const updateDollarSchema = z.object({
  amount: z.number().positive(),
});

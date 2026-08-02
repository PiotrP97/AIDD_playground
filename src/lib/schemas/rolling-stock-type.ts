import { z } from "zod";

export const rollingStockTypeCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type RollingStockTypeCreateInput = z.infer<typeof rollingStockTypeCreateSchema>;

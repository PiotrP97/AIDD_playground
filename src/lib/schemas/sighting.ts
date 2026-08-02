import { z } from "zod";

export const sightingCreateSchema = z.object({
  rollingStockTypeId: z.uuid(),
  stationId: z.uuid(),
  occurredAt: z.iso.datetime(),
});

export type SightingCreateInput = z.infer<typeof sightingCreateSchema>;

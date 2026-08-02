import { z } from "zod";

export const stationCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

export type StationCreateInput = z.infer<typeof stationCreateSchema>;

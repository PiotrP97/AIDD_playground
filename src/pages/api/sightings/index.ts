import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { sightingCreateSchema } from "@/lib/schemas/sighting";

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const user = context.locals.user;
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body: unknown = await context.request.json().catch(() => null);
  const parsed = sightingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      rolling_stock_type_id: parsed.data.rollingStockTypeId,
      station_id: parsed.data.stationId,
      occurred_at: parsed.data.occurredAt,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23503") {
      return Response.json({ error: "The referenced rolling-stock type or station no longer exists" }, { status: 404 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
};

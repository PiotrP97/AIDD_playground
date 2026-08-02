import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { rollingStockTypeCreateSchema } from "@/lib/schemas/rolling-stock-type";

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const query = context.url.searchParams.get("q")?.trim() ?? "";
  let queryBuilder = supabase.from("rolling_stock_types").select("id, name");
  if (query) {
    queryBuilder = queryBuilder.ilike("name", `%${query}%`);
  }

  const { data, error } = await queryBuilder.order("name").limit(20);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ items: data });
};

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
  const parsed = rollingStockTypeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rolling_stock_types")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "A rolling-stock type with this name already exists" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
};

# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Query errors from Supabase must be checked, not just destructured-and-ignored

**Context**: src/pages/stations/[id].astro:20-26

**Problem**: `const { data } = await supabase.from(...).single();` never checks `error`. A malformed id or a transient DB/RLS failure looks identical to a genuinely missing row — real outages hide silently from both users and logs.

**Rule**: Always check for errors when executing a query to the database. Make sure the query itself does not hide errors.

**Applies to**: DB queries

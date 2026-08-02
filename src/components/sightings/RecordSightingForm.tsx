import { useState, type SyntheticEvent } from "react";
import { CreatableCombobox } from "@/components/sightings/CreatableCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sightingCreateSchema } from "@/lib/schemas/sighting";

function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RecordSightingForm() {
  const [rollingStockTypeId, setRollingStockTypeId] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(null);
  const [occurredAtLocal, setOccurredAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(rollingStockTypeId) && Boolean(stationId) && occurredAtLocal.length > 0 && !submitting;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rollingStockTypeId || !stationId) {
      return;
    }

    const occurredAt = new Date(occurredAtLocal).toISOString();
    const parsed = sightingCreateSchema.safeParse({ rollingStockTypeId, stationId, occurredAt });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid sighting details");
      return;
    }

    setSubmitting(true);
    setError(null);
    fetch("/api/sightings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
      .then(async (res) => {
        const body = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Could not record sighting");
        }
        return body;
      })
      .then(() => {
        window.location.href = `/stations/${stationId}`;
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not record sighting");
        setSubmitting(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Rolling-stock type</Label>
        <CreatableCombobox
          searchEndpoint="/api/rolling-stock-types"
          createEndpoint="/api/rolling-stock-types"
          label="rolling-stock type"
          onSelect={(id) => {
            setRollingStockTypeId(id);
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Station</Label>
        <CreatableCombobox
          searchEndpoint="/api/stations"
          createEndpoint="/api/stations"
          label="station"
          onSelect={(id) => {
            setStationId(id);
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurred-at">When did you see it?</Label>
        <Input
          id="occurred-at"
          type="datetime-local"
          value={occurredAtLocal}
          onChange={(event) => {
            setOccurredAtLocal(event.target.value);
          }}
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "Recording…" : "Record sighting"}
      </Button>
    </form>
  );
}

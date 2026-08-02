import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  name: string;
}

interface CreatableComboboxProps {
  searchEndpoint: string;
  createEndpoint: string;
  label: string;
  onSelect: (id: string, name: string) => void;
}

export function CreatableCombobox({ searchEndpoint, createEndpoint, label, onSelect }: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`${searchEndpoint}?q=${encodeURIComponent(query)}`)
        .then((res) => res.json() as Promise<{ items: SearchItem[] }>)
        .then((data) => {
          setItems(data.items);
        })
        .catch(() => {
          setItems([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, open, searchEndpoint]);

  const trimmedQuery = query.trim();
  const hasExactMatch = items.some((item) => item.name.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreate = trimmedQuery.length > 0 && !hasExactMatch;

  const handleSelect = (item: SearchItem) => {
    setSelected(item);
    onSelect(item.id, item.name);
    setOpen(false);
    setError(null);
  };

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    fetch(createEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedQuery }),
    })
      .then(async (res) => {
        const body = (await res.json()) as SearchItem & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Could not create");
        }
        return body;
      })
      .then((item) => {
        handleSelect(item);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not create");
      })
      .finally(() => {
        setCreating(false);
      });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? selected.name : `Select ${label.toLowerCase()}…`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              {loading && <div className="text-muted-foreground py-6 text-center text-sm">Searching…</div>}
              {!loading && items.length === 0 && !showCreate && (
                <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              )}
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      handleSelect(item);
                    }}
                  >
                    <Check className={cn("size-4", selected?.id === item.id ? "opacity-100" : "opacity-0")} />
                    {item.name}
                  </CommandItem>
                ))}
                {showCreate && (
                  <CommandItem value={`__create__${trimmedQuery}`} onSelect={handleCreate} disabled={creating}>
                    {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                    Create &quot;{trimmedQuery}&quot;
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

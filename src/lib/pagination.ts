export const PAGE_SIZE = 20;

export interface PageRange {
  from: number;
  to: number;
}

export function parsePage(raw: string | null): number {
  if (!raw) {
    return 1;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function calculateRange(page: number, pageSize: number): PageRange {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

export function calculateTotalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages);
}

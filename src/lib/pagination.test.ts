import { describe, expect, it } from "vitest";
import { calculateRange, calculateTotalPages, clampPage, PAGE_SIZE, parsePage } from "./pagination";

describe("parsePage", () => {
  it("returns 1 when raw is null", () => {
    expect(parsePage(null)).toBe(1);
  });

  it("returns 1 for a non-numeric string", () => {
    expect(parsePage("abc")).toBe(1);
  });

  it("returns 1 for zero", () => {
    expect(parsePage("0")).toBe(1);
  });

  it("returns 1 for a negative number", () => {
    expect(parsePage("-3")).toBe(1);
  });

  it("returns the parsed integer for a valid page", () => {
    expect(parsePage("2")).toBe(2);
  });
});

describe("calculateRange", () => {
  it("computes the zero-indexed range for page 1", () => {
    expect(calculateRange(1, PAGE_SIZE)).toEqual({ from: 0, to: 19 });
  });

  it("computes the zero-indexed range for page 2", () => {
    expect(calculateRange(2, PAGE_SIZE)).toEqual({ from: 20, to: 39 });
  });
});

describe("calculateTotalPages", () => {
  it("returns 1 page when there are zero rows", () => {
    expect(calculateTotalPages(0, 20)).toBe(1);
  });

  it("rounds up a partial last page", () => {
    expect(calculateTotalPages(21, 20)).toBe(2);
  });

  it("returns exactly 1 page when the count matches the page size exactly", () => {
    expect(calculateTotalPages(20, 20)).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps a page above the valid range down to the last page", () => {
    expect(clampPage(9999, 3)).toBe(3);
  });

  it("clamps a page below the valid range up to page 1", () => {
    expect(clampPage(0, 3)).toBe(1);
  });

  it("leaves an in-range page unchanged", () => {
    expect(clampPage(2, 3)).toBe(2);
  });
});

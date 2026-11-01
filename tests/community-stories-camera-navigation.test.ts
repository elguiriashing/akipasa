import { describe, expect, it } from "vitest";
import { crossesCheckinDocumentBoundary } from "../src/lib/checkin-document-navigation";

describe("scanner document policy navigation", () => {
  it.each([
    ["/en", "/en/check-in?source=dock", true],
    ["/es/community", "/es/check-in", true],
    ["/en/check-in", "/en", true],
    ["/es/check-in", "/es/check-in/00000000-0000-4000-8000-000000000001", true],
    ["/en/check-in", "/es/check-in", false],
    ["/en/check-in", "/en/check-in#scanner", false],
    ["/en", "/en/map?city=malaga", false],
    ["/en/check-in", "https://other.example/en", false],
  ])("%s to %s requires a fresh policy: %s", (from, to, expected) => {
    expect(
      crossesCheckinDocumentBoundary(`https://akipasa.example${from}`, to),
    ).toBe(expected);
  });
});

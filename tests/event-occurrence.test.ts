import { describe, expect, it } from "vitest";
import {
  occurrenceHref,
  requestedOccurrenceId,
  selectEventOccurrence,
} from "@/lib/event-occurrence";
import type { Occurrence } from "@/lib/domain";

const occurrences: Occurrence[] = [
  {
    id: "past",
    startsAt: "2026-10-01T10:00:00Z",
    endsAt: "2026-10-01T12:00:00Z",
    status: "scheduled",
  },
  {
    id: "next",
    startsAt: "2026-11-01T10:00:00Z",
    endsAt: "2026-11-01T12:00:00Z",
    status: "scheduled",
  },
  {
    id: "chosen",
    startsAt: "2026-12-01T10:00:00Z",
    endsAt: "2026-12-01T12:00:00Z",
    status: "sold_out",
  },
];

describe("event occurrence continuity", () => {
  it("uses an exact selected occurrence even when it is not the default", () => {
    expect(
      selectEventOccurrence(
        occurrences,
        "chosen",
        new Date("2026-10-14T00:00:00Z"),
      )?.id,
    ).toBe("chosen");
  });

  it("falls back from invalid input to the next non-cancelled occurrence", () => {
    expect(
      selectEventOccurrence(
        occurrences,
        "../chosen",
        new Date("2026-10-14T00:00:00Z"),
      )?.id,
    ).toBe("next");
    expect(requestedOccurrenceId("../chosen")).toBeUndefined();
  });

  it("builds one encoded occurrence query for downstream routes", () => {
    expect(occurrenceHref("/en/events/local", "chosen-occurrence")).toBe(
      "/en/events/local?occurrence=chosen-occurrence",
    );
  });
});

import { describe, it, expect } from "vitest";
import {
  ACTIVE_BOARD_STAGES,
  boardVisibleStages,
  parseBoardShowClosed,
} from "@/lib/board-filter";
import { OPEN_STAGES, STAGES } from "@/lib/types";

describe("board filter contract (hide won/lost by default)", () => {
  it("defaults to active stages only (no won/lost)", () => {
    expect(ACTIVE_BOARD_STAGES).toEqual([
      "new",
      "contacted",
      "visit_scheduled",
      "negotiation",
    ]);
    expect(ACTIVE_BOARD_STAGES).toEqual(OPEN_STAGES);
    expect(boardVisibleStages(false)).toEqual(ACTIVE_BOARD_STAGES);
    expect(boardVisibleStages(false)).not.toContain("won");
    expect(boardVisibleStages(false)).not.toContain("lost");
  });

  it("showClosed reveals all STAGES including won + lost", () => {
    expect(boardVisibleStages(true)).toEqual([...STAGES]);
    expect(boardVisibleStages(true)).toContain("won");
    expect(boardVisibleStages(true)).toContain("lost");
  });

  it("parseBoardShowClosed accepts closed=1 or show=all", () => {
    expect(parseBoardShowClosed({})).toBe(false);
    expect(parseBoardShowClosed({ closed: "0" })).toBe(false);
    expect(parseBoardShowClosed({ closed: "1" })).toBe(true);
    expect(parseBoardShowClosed({ show: "all" })).toBe(true);
    expect(parseBoardShowClosed({ show: "active" })).toBe(false);
  });

  it("explicit stage=won|lost still reveals that column when closed hidden", () => {
    expect(boardVisibleStages(false, "won")).toContain("won");
    expect(boardVisibleStages(false, "lost")).toContain("lost");
    expect(boardVisibleStages(false, "won")).toEqual([
      ...ACTIVE_BOARD_STAGES,
      "won",
    ]);
  });

  it("explicit open stage keeps active columns when closed hidden", () => {
    expect(boardVisibleStages(false, "new")).toEqual(ACTIVE_BOARD_STAGES);
  });
});

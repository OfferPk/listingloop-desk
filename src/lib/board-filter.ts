import { OPEN_STAGES, STAGES, type Stage } from "./types";

/** Active pipeline columns when closed (won/lost) are hidden — default board. */
export const ACTIVE_BOARD_STAGES: Stage[] = [...OPEN_STAGES];

/** Parse ?closed=1 or ?show=all → reveal won + lost columns. */
export function parseBoardShowClosed(sp: {
  closed?: string;
  show?: string;
}): boolean {
  return sp.closed === "1" || sp.show === "all";
}

/**
 * Visible board columns.
 * - Default: active only (new | contacted | visit_scheduled | negotiation).
 * - showClosed: all STAGES including won + lost.
 * - Explicit stage=won|lost still reveals that column when closed are hidden.
 * - Explicit open stage keeps active columns (data already filtered by listInquiries).
 */
export function boardVisibleStages(
  showClosed: boolean,
  stageFilter?: string
): Stage[] {
  if (stageFilter && STAGES.includes(stageFilter as Stage)) {
    const s = stageFilter as Stage;
    if (showClosed) return [...STAGES];
    if (ACTIVE_BOARD_STAGES.includes(s)) return [...ACTIVE_BOARD_STAGES];
    // Explicit won/lost filter must still work when closed columns are hidden.
    return [...ACTIVE_BOARD_STAGES, s];
  }
  return showClosed ? [...STAGES] : [...ACTIVE_BOARD_STAGES];
}

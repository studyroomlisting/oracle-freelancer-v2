/**
 * Recomputes a running average rating when a new rating is added, without
 * needing to re-read every historical review. Standard incremental-average
 * formula: newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1).
 */
export function recomputeAverageRating(oldAvg: number, oldCount: number, newRating: number): { avg: number; count: number } {
  const count = oldCount + 1;
  const avg = (oldAvg * oldCount + newRating) / count;
  return { avg: Math.round(avg * 100) / 100, count };
}

/** Whether every milestone in a list is APPROVED — the trigger for marking an Order COMPLETED. */
export function allMilestonesApproved(milestoneStatuses: string[]): boolean {
  return milestoneStatuses.length > 0 && milestoneStatuses.every((s) => s === "APPROVED");
}

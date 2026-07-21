export type ReportRatingLevel = {
  discretePercent: 100 | 90 | 50 | 0;
  label: string;
  description: string;
};

/**
 * Four-level report rating scale. Continuous Y/(Y+N) percentages map to the
 * nearest discrete level via midpoint cutoffs (95 / 70 / 25).
 */
export const REPORT_RATING_LEVELS: ReportRatingLevel[] = [
  {
    discretePercent: 100,
    label: "Objective Fully Met",
    description:
      "The client independently expressed their wants or needs verbally during all observed opportunities today. No staff prompting or assistance was required.",
  },
  {
    discretePercent: 90,
    label: "Objective Mostly Met",
    description:
      "The client verbally expressed their wants or needs during most observed opportunities today. Minimal staff prompting or one reminder was required.",
  },
  {
    discretePercent: 50,
    label: "Objective Partially Met",
    description:
      "The client verbally expressed their wants or needs during approximately half of the observed opportunities today. Moderate staff prompting, modeling, or repeated reminders were required.",
  },
  {
    discretePercent: 0,
    label: "Objective Not Met",
    description:
      "The client did not verbally express their wants or needs during the observed opportunities today. Staff provided prompting and support, but the client did not complete the objective.",
  },
];

/**
 * Maps a continuous rating_percent to the nearest discrete report rating.
 * Cutoffs are midpoints between 100/90/50/0 (≥95 → 100, ≥70 → 90, ≥25 → 50, else 0).
 */
export function getReportRating(ratingPercent: number): ReportRatingLevel {
  if (ratingPercent >= 95) {
    return REPORT_RATING_LEVELS[0];
  }
  if (ratingPercent >= 70) {
    return REPORT_RATING_LEVELS[1];
  }
  if (ratingPercent >= 25) {
    return REPORT_RATING_LEVELS[2];
  }
  return REPORT_RATING_LEVELS[3];
}

/** Display line like "90% — Objective Mostly Met". */
export function formatReportRating(ratingPercent: number): string {
  const rating = getReportRating(ratingPercent);
  return `${rating.discretePercent}% — ${rating.label}`;
}

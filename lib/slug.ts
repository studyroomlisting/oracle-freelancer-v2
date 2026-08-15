/**
 * Generates a URL-safe slug from a title plus a short unique suffix, so two
 * records with the same title never collide. Previously this exact logic
 * was copy-pasted in app/api/gigs/route.ts, app/api/teams/route.ts, and
 * app/api/projects/[id]/applications/[appId]/accept/route.ts — extracted
 * here so a future change to the slug strategy (e.g. collision handling)
 * happens in one place.
 */
export function generateSlug(title: string, uniqueSuffix: string = Date.now().toString(36)): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${uniqueSuffix}`;
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { sampleGigs, sampleTeams } from "@/lib/sampleData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/trainers`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/workshops`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/teams`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/teams/build`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/teams/recommend`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/projects`, changeFrequency: "hourly", priority: 0.7 },
  ];

  let gigSlugs: string[] = [];
  let freelancerSlugs: string[] = [];
  let teamSlugs: string[] = [];
  let projectSlugs: string[] = [];

  if (process.env.DATABASE_URL) {
    try {
      const [gigs, freelancers, teams, projects] = await Promise.all([
        prisma.gig.findMany({ where: { status: "ACTIVE" }, select: { slug: true } }),
        prisma.freelancerProfile.findMany({ select: { slug: true } }),
        prisma.team.findMany({ where: { status: "ACTIVE" }, select: { slug: true } }),
        prisma.projectPosting.findMany({ where: { status: "OPEN" }, select: { slug: true } }),
      ]);
      gigSlugs = gigs.map((g: any) => g.slug);
      freelancerSlugs = freelancers.map((f: any) => f.slug);
      teamSlugs = teams.map((t: any) => t.slug);
      projectSlugs = projects.map((p: any) => p.slug);
    } catch {
      // fall through to sample data below
    }
  }

  if (gigSlugs.length === 0) gigSlugs = sampleGigs.map((g) => g.slug);
  if (freelancerSlugs.length === 0) freelancerSlugs = Array.from(new Set(sampleGigs.map((g) => g.freelancerSlug)));
  if (teamSlugs.length === 0) teamSlugs = sampleTeams.map((t) => t.slug);

  return [
    ...staticRoutes,
    ...gigSlugs.map((slug) => ({ url: `${SITE_URL}/gigs/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...freelancerSlugs.map((slug) => ({ url: `${SITE_URL}/freelancers/${slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...teamSlugs.map((slug) => ({ url: `${SITE_URL}/teams/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...projectSlugs.map((slug) => ({ url: `${SITE_URL}/projects/${slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}

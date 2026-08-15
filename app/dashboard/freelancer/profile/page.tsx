import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EditProfileForm from "@/components/EditProfileForm";
import { getCategories } from "@/lib/queries";

export default async function EditProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let initial = {
    headline: "",
    bio: "",
    oracleModules: "",
    hourlyRateGbp: "",
    yearsExperience: "",
    avatarUrl: null as string | null,
    resumeUrl: null as string | null,
    isProfilePublic: true,
  };
  let portfolioItems: { id: string; title: string; description: string; imageUrl: string | null; videoUrl: string | null; projectUrl: string | null }[] = [];
  let educationEntries: { id: string; institution: string; degree: string; fieldOfStudy: string | null; graduationYear: number | null }[] = [];
  let workExperienceEntries: { id: string; companyName: string; role: string; startYear: number; endYear: number | null; description: string | null }[] = [];

  if (process.env.DATABASE_URL) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.sub },
      include: {
        user: true,
        portfolioItems: { orderBy: { displayOrder: "asc" } },
        education: { orderBy: { displayOrder: "asc" } },
        workExperience: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (profile) {
      initial = {
        headline: profile.headline,
        bio: profile.bio,
        oracleModules: profile.oracleModules,
        hourlyRateGbp: profile.hourlyRateGbp ? String(profile.hourlyRateGbp) : "",
        yearsExperience: String(profile.yearsExperience),
        avatarUrl: profile.user.avatarUrl,
        resumeUrl: profile.resumeUrl,
        isProfilePublic: profile.isProfilePublic,
      };
      portfolioItems = profile.portfolioItems;
      educationEntries = profile.education;
      workExperienceEntries = profile.workExperience;
    }
  }

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Edit profile</h1>
      <p className="text-sm text-neutral-500 mb-8">This is what clients see on your public freelancer profile.</p>
      <EditProfileForm initial={initial} categories={categories} portfolioItems={portfolioItems} educationEntries={educationEntries} workExperienceEntries={workExperienceEntries} />
    </div>
  );
}

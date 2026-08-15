import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/queries";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Onboarding requires a connected database.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) redirect("/auth/login");
  if (user.role === "ADMIN") redirect("/dashboard/admin");
  if (user.onboardingCompletedAt) {
    redirect(user.role === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard/client");
  }

  const categories = await getCategories();

  if (user.role === "FREELANCER") {
    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
    return (
      <OnboardingForm
        role="FREELANCER"
        categories={categories}
        initialFreelancer={{
          headline: profile?.headline ?? "",
          bio: profile?.bio ?? "",
          oracleModules: profile?.oracleModules ?? "",
          yearsExperience: String(profile?.yearsExperience ?? ""),
          hourlyRateGbp: profile?.hourlyRateGbp ? String(profile.hourlyRateGbp) : "",
          avatarUrl: user.avatarUrl,
          resumeUrl: profile?.resumeUrl ?? null,
        }}
      />
    );
  }

  return (
    <OnboardingForm
      role="CLIENT"
      categories={categories}
      initialClient={{
        companyName: user.companyName ?? "",
        companyIndustry: user.companyIndustry ?? "",
        companySize: user.companySize ?? "",
        avatarUrl: user.avatarUrl,
      }}
    />
  );
}

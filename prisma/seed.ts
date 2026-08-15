import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { slug: "oracle-fusion-scm", name: "Oracle Fusion SCM", description: "Supply chain, procurement, inventory, order management." },
    { slug: "oracle-fusion-hcm", name: "Oracle Fusion HCM", description: "Core HR, payroll, talent management." },
    { slug: "oracle-fusion-financials", name: "Oracle Fusion Financials", description: "GL, AP/AR, cash management, fixed assets." },
    { slug: "oracle-ebs", name: "Oracle EBS", description: "E-Business Suite implementation and support." },
    { slug: "oracle-oic", name: "Oracle OIC", description: "Integration Cloud, REST/SOAP adapters, orchestration." },
    { slug: "oracle-apex", name: "Oracle APEX", description: "Low-code app development on Oracle Database." },
    { slug: "oracle-epm", name: "Oracle EPM", description: "Planning, budgeting, consolidation, and reporting." },
  ];

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const scm = await prisma.category.findUniqueOrThrow({ where: { slug: "oracle-fusion-scm" } });
  const oic = await prisma.category.findUniqueOrThrow({ where: { slug: "oracle-oic" } });
  const financials = await prisma.category.findUniqueOrThrow({ where: { slug: "oracle-fusion-financials" } });
  const epm = await prisma.category.findUniqueOrThrow({ where: { slug: "oracle-epm" } });

  // NOTE: User.id is no longer auto-generated (Supabase Auth assigns the real
  // UUID at signup) and User no longer stores a password — Supabase Auth owns
  // both. These seed rows are demo PROFILE data only; they won't be able to
  // log in as-is unless matching accounts are also created in Supabase Auth
  // (e.g. via the Admin API) using the same id/email.
  const priyaUser = await prisma.user.upsert({
    where: { email: "priya@example.com" },
    update: {},
    create: { id: randomUUID(), email: "priya@example.com", fullName: "Priya R.", role: "FREELANCER" },
  });

  const priyaProfile = await prisma.freelancerProfile.upsert({
    where: { userId: priyaUser.id },
    update: {},
    create: {
      userId: priyaUser.id,
      slug: "priya-r",
      headline: "Oracle Fusion SCM Consultant — 8 yrs implementation experience",
      bio: "I help mid-market manufacturers configure Fusion SCM inventory, procurement, and order management. Certified Oracle Cloud SCM Implementation Specialist.",
      hourlyRateGbp: 65,
      yearsExperience: 8,
      oracleModules: "SCM,Inventory,Procurement",
      isCertified: true,
      ratingAvg: 4.9,
      ratingCount: 62,
    },
  });

  const scmGig = await prisma.gig.upsert({
    where: { slug: "fusion-scm-inventory-setup" },
    update: {},
    create: {
      slug: "fusion-scm-inventory-setup",
      freelancerProfileId: priyaProfile.id,
      categoryId: scm.id,
      title: "Configure Oracle Fusion SCM inventory & cycle counting",
      description: "End-to-end inventory org setup, subinventories, and cycle count automation via REST API.",
      status: "ACTIVE",
      coverImageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=60",
    },
  });

  await prisma.gigPackage.createMany({
    data: [
      { gigId: scmGig.id, tier: "BASIC", title: "Basic setup", description: "Single inventory org configuration.", priceGbp: 450, deliveryDays: 5, revisions: 1 },
      { gigId: scmGig.id, tier: "STANDARD", title: "Standard setup", description: "Multi-org with subinventories.", priceGbp: 810, deliveryDays: 7, revisions: 2 },
      { gigId: scmGig.id, tier: "PREMIUM", title: "Premium setup", description: "Full setup with cycle count automation & handover call.", priceGbp: 1350, deliveryDays: 10, revisions: 3 },
    ],
    skipDuplicates: true,
  });

  const danielUser = await prisma.user.upsert({
    where: { email: "daniel@example.com" },
    update: {},
    create: { id: randomUUID(), email: "daniel@example.com", fullName: "Daniel O.", role: "FREELANCER" },
  });

  const danielProfile = await prisma.freelancerProfile.upsert({
    where: { userId: danielUser.id },
    update: {},
    create: {
      userId: danielUser.id,
      slug: "daniel-o",
      headline: "Oracle Integration Cloud (OIC) Developer",
      bio: "Building resilient OIC integrations for finance and SCM teams.",
      hourlyRateGbp: 55,
      yearsExperience: 5,
      oracleModules: "OIC,REST,SOAP",
      isCertified: false,
      ratingAvg: 4.7,
      ratingCount: 34,
    },
  });

  const oicGig = await prisma.gig.upsert({
    where: { slug: "oic-rest-integration-build" },
    update: {},
    create: {
      slug: "oic-rest-integration-build",
      freelancerProfileId: danielProfile.id,
      categoryId: oic.id,
      title: "Build a REST-to-REST OIC integration with error handling",
      description: "Design and deploy a resilient integration flow with retries, mapping, and monitoring.",
      status: "ACTIVE",
      coverImageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=60",
    },
  });

  await prisma.gigPackage.createMany({
    data: [
      { gigId: oicGig.id, tier: "BASIC", title: "Basic flow", description: "Single REST-to-REST mapping.", priceGbp: 300, deliveryDays: 4, revisions: 1 },
      { gigId: oicGig.id, tier: "STANDARD", title: "Standard flow", description: "With retry & error handling.", priceGbp: 540, deliveryDays: 6, revisions: 2 },
      { gigId: oicGig.id, tier: "PREMIUM", title: "Premium flow", description: "Full monitoring & documentation.", priceGbp: 900, deliveryDays: 9, revisions: 3 },
    ],
    skipDuplicates: true,
  });

  // --- Sophie L. — Financials & EPM specialist (fills the two previously-uncovered categories) ---
  const sophieUser = await prisma.user.upsert({
    where: { email: "sophie@example.com" },
    update: {},
    create: { id: randomUUID(), email: "sophie@example.com", fullName: "Sophie L.", role: "FREELANCER" },
  });
  const sophieProfile = await prisma.freelancerProfile.upsert({
    where: { userId: sophieUser.id },
    update: {},
    create: {
      userId: sophieUser.id,
      slug: "sophie-l",
      headline: "Oracle Fusion Financials & EPM Consultant",
      bio: "I help finance teams migrate off legacy systems onto Fusion Financials and EPM, with a focus on clean chart-of-accounts design and driver-based planning models.",
      hourlyRateGbp: 70,
      yearsExperience: 9,
      oracleModules: "Financials,EPM,GL,Planning",
      isCertified: false,
      ratingAvg: 4.9,
      ratingCount: 23,
      onTimeDeliveryRate: 95,
      avgResponseMinutes: 12,
      collaborationRating: 9.3,
      projectsCompleted: 20,
    },
  });

  const financialsGig = await prisma.gig.upsert({
    where: { slug: "fusion-financials-gl-ap-ar-setup" },
    update: {},
    create: {
      slug: "fusion-financials-gl-ap-ar-setup",
      freelancerProfileId: sophieProfile.id,
      categoryId: financials.id,
      title: "Configure Oracle Fusion Financials GL, AP and AR from scratch",
      description:
        "Full chart of accounts design, ledger setup, and AP/AR configuration for small-to-mid-size finance teams migrating off legacy systems. Includes a walkthrough of month-end close procedures.",
      status: "ACTIVE",
      coverImageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=60",
    },
  });
  await prisma.gigPackage.createMany({
    data: [
      { gigId: financialsGig.id, tier: "BASIC", title: "Basic GL setup", description: "Chart of accounts and single ledger.", priceGbp: 520, deliveryDays: 6, revisions: 1 },
      { gigId: financialsGig.id, tier: "STANDARD", title: "Standard finance setup", description: "GL + AP/AR configuration.", priceGbp: 940, deliveryDays: 9, revisions: 2 },
      { gigId: financialsGig.id, tier: "PREMIUM", title: "Premium finance setup", description: "Full GL/AP/AR + month-end close training.", priceGbp: 1560, deliveryDays: 14, revisions: 3 },
    ],
    skipDuplicates: true,
  });

  const epmGig = await prisma.gig.upsert({
    where: { slug: "epm-planning-budgeting-cloud-setup" },
    update: {},
    create: {
      slug: "epm-planning-budgeting-cloud-setup",
      freelancerProfileId: sophieProfile.id,
      categoryId: epm.id,
      title: "Set up Oracle EPM Planning and Budgeting Cloud for your business",
      description:
        "Design and configure Oracle EPM Planning & Budgeting Cloud, including driver-based forecasting models, approval workflows, and dashboard reporting for finance leadership.",
      status: "ACTIVE",
      coverImageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=60",
    },
  });
  await prisma.gigPackage.createMany({
    data: [
      { gigId: epmGig.id, tier: "BASIC", title: "Basic planning model", description: "Single driver-based forecast model.", priceGbp: 680, deliveryDays: 8, revisions: 1 },
      { gigId: epmGig.id, tier: "STANDARD", title: "Standard planning setup", description: "Forecast model + approval workflow.", priceGbp: 1150, deliveryDays: 12, revisions: 2 },
      { gigId: epmGig.id, tier: "PREMIUM", title: "Premium planning setup", description: "Full model, workflow, and executive dashboards.", priceGbp: 1900, deliveryDays: 18, revisions: 3 },
    ],
    skipDuplicates: true,
  });

  // --- Open Project Board sample postings, so /projects has real, varied data ---
  const financialsClient = await prisma.user.upsert({
    where: { email: "client-manufacturing@example.com" },
    update: {},
    create: { id: randomUUID(), email: "client-manufacturing@example.com", fullName: "Northgate Manufacturing Ltd", role: "CLIENT" },
  });

  const postingA = await prisma.projectPosting.upsert({
    where: { slug: "fusion-financials-golive-support" },
    update: {},
    create: {
      slug: "fusion-financials-golive-support",
      clientId: financialsClient.id,
      title: "Fusion Financials Go-Live Support",
      description:
        "We're 6 weeks from go-live on Fusion Financials and need an experienced consultant to support cutover testing, reconcile GL balances, and train our finance team on month-end close.",
      categoryId: financials.id,
      budgetMinGbp: 8000,
      budgetMaxGbp: 12000,
      timelineWeeks: 6,
      status: "OPEN",
    },
  });

  const postingB = await prisma.projectPosting.upsert({
    where: { slug: "scm-inventory-procurement-rollout" },
    update: {},
    create: {
      slug: "scm-inventory-procurement-rollout",
      clientId: financialsClient.id,
      title: "SCM Inventory & Procurement Rollout",
      description:
        "Mid-size manufacturer needs Fusion SCM inventory and procurement configured across 3 warehouses, including cycle count automation and supplier onboarding workflows.",
      categoryId: scm.id,
      budgetMinGbp: 10000,
      budgetMaxGbp: 15000,
      timelineWeeks: 10,
      status: "OPEN",
    },
  });

  // A sample application on postingA, so the client dashboard / project detail
  // page has something real to show reviewers out of the box.
  await prisma.projectApplication.upsert({
    where: { projectPostingId_freelancerProfileId: { projectPostingId: postingA.id, freelancerProfileId: sophieProfile.id } },
    update: {},
    create: {
      projectPostingId: postingA.id,
      freelancerProfileId: sophieProfile.id,
      coverLetter:
        "I've supported 5 Fusion Financials go-lives in the last 2 years, most recently for a similar-size manufacturer. Happy to start with a cutover readiness review this week.",
      proposedPriceGbp: 9500,
      proposedWeeks: 6,
      status: "PENDING",
    },
  });

  // A gig awaiting admin approval, so /dashboard/admin has something to show out of the box.
  await prisma.gig.upsert({
    where: { slug: "apex-inventory-dashboard-demo" },
    update: {},
    create: {
      slug: "apex-inventory-dashboard-demo",
      freelancerProfileId: danielProfile.id,
      categoryId: scm.id,
      title: "I will build a live Oracle APEX inventory dashboard",
      description: "A real-time inventory dashboard built on Oracle APEX, pulling directly from Fusion SCM views.",
      status: "PENDING_REVIEW",
      gigType: "CONSULTING",
      coverImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=60",
    },
  });

  // --- Trust Score backfill for existing profiles ---
  await prisma.freelancerProfile.update({
    where: { id: priyaProfile.id },
    data: { onTimeDeliveryRate: 96, avgResponseMinutes: 5, collaborationRating: 9.7, projectsCompleted: 22 },
  });
  await prisma.freelancerProfile.update({
    where: { id: danielProfile.id },
    data: { onTimeDeliveryRate: 92, avgResponseMinutes: 10, collaborationRating: 9.0, projectsCompleted: 16 },
  });

  // --- Remaining team members for Oracle Fusion Team Alpha ---
  const graceUser = await prisma.user.upsert({
    where: { email: "grace@example.com" },
    update: {},
    create: { id: randomUUID(), email: "grace@example.com", fullName: "Grace M.", role: "FREELANCER" },
  });
  const graceProfile = await prisma.freelancerProfile.upsert({
    where: { userId: graceUser.id },
    update: {},
    create: {
      userId: graceUser.id,
      slug: "grace-m",
      headline: "Oracle EBS & Fusion Finance Consultant — 12 yrs",
      bio: "12 years in Oracle EBS Procurement and Supplier Portal implementations, now delivering Fusion Finance rollouts.",
      hourlyRateGbp: 85,
      yearsExperience: 12,
      oracleModules: "EBS,Finance,Procurement",
      isCertified: true,
      ratingAvg: 5.0,
      ratingCount: 18,
      onTimeDeliveryRate: 98,
      avgResponseMinutes: 15,
      collaborationRating: 9.5,
      projectsCompleted: 14,
    },
  });

  const ahmedUser = await prisma.user.upsert({
    where: { email: "ahmed@example.com" },
    update: {},
    create: { id: randomUUID(), email: "ahmed@example.com", fullName: "Ahmed K.", role: "FREELANCER" },
  });
  const ahmedProfile = await prisma.freelancerProfile.upsert({
    where: { userId: ahmedUser.id },
    update: {},
    create: {
      userId: ahmedUser.id,
      slug: "ahmed-k",
      headline: "Oracle APEX & SCM Developer",
      bio: "Shipped 30+ APEX apps for HR, procurement, and finance approval workflows.",
      hourlyRateGbp: 55,
      yearsExperience: 5,
      oracleModules: "APEX,SCM",
      isCertified: false,
      ratingAvg: 4.8,
      ratingCount: 41,
      onTimeDeliveryRate: 94,
      avgResponseMinutes: 20,
      collaborationRating: 9.2,
      projectsCompleted: 19,
      isTrainer: true,
      teachingExperienceYears: 3,
      preferredTeachingMode: "ONLINE",
    },
  });

  const nadiaUser = await prisma.user.upsert({
    where: { email: "nadia@example.com" },
    update: {},
    create: { id: randomUUID(), email: "nadia@example.com", fullName: "Nadia S.", role: "FREELANCER" },
  });
  const nadiaProfile = await prisma.freelancerProfile.upsert({
    where: { userId: nadiaUser.id },
    update: {},
    create: {
      userId: nadiaUser.id,
      slug: "nadia-s",
      headline: "Oracle Programme Manager",
      bio: "Trained 15+ in-house teams and run Oracle programme delivery end-to-end, from kickoff to go-live.",
      hourlyRateGbp: 75,
      yearsExperience: 10,
      oracleModules: "HCM,Programme Management",
      isCertified: true,
      ratingAvg: 4.9,
      ratingCount: 27,
      onTimeDeliveryRate: 97,
      avgResponseMinutes: 8,
      collaborationRating: 9.8,
      projectsCompleted: 25,
      isTrainer: true,
      teachingExperienceYears: 6,
      maxStudentsPerSession: 8,
      preferredTeachingMode: "HYBRID",
      trainerBio: "I run structured payroll and programme-management training for teams transitioning to Fusion.",
    },
  });

  // Sample weekly availability for Nadia — Mon-Fri, 09:00-17:00 UTC.
  await prisma.trainerAvailability.deleteMany({ where: { freelancerProfileId: nadiaProfile.id } });
  await prisma.trainerAvailability.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      freelancerProfileId: nadiaProfile.id,
      dayOfWeek,
      startMinuteUtc: 9 * 60,
      endMinuteUtc: 17 * 60,
    })),
  });

  // --- Oracle Fusion Team Alpha ---
  const teamAlpha = await prisma.team.upsert({
    where: { slug: "oracle-fusion-team-alpha" },
    update: {},
    create: {
      slug: "oracle-fusion-team-alpha",
      name: "Oracle Fusion Team Alpha",
      description:
        "A full Fusion Financials + SCM implementation team for mid-market manufacturers who need coordinated delivery without a big-four price tag. Led by a certified Solution Architect with 12 years on Oracle programmes.",
      teamLeaderId: priyaProfile.id,
      dailyRateGbp: 3000,
      availableFromDate: new Date(Date.now() + 21 * 24 * 3600 * 1000),
      estimatedWeeks: 12,
      status: "ACTIVE",
      teamScore: 9.8,
      projectsCompleted: 52,
      budgetDeliveredGbp: 3200000,
      successRate: 98,
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: teamAlpha.id, freelancerProfileId: priyaProfile.id, roleLabel: "Team Leader — Oracle Finance Solution Architect", displayOrder: 0 },
      { teamId: teamAlpha.id, freelancerProfileId: graceProfile.id, roleLabel: "Finance Functional Consultant", displayOrder: 1 },
      { teamId: teamAlpha.id, freelancerProfileId: ahmedProfile.id, roleLabel: "SCM Functional Consultant", displayOrder: 2 },
      { teamId: teamAlpha.id, freelancerProfileId: danielProfile.id, roleLabel: "Technical Consultant / Integration Specialist", displayOrder: 3 },
      { teamId: teamAlpha.id, freelancerProfileId: nadiaProfile.id, roleLabel: "Project Manager", displayOrder: 4 },
    ],
    skipDuplicates: true,
  });

  // Priya already leads Team Alpha, so give her an active subscription —
  // otherwise she'd be blocked from creating a second team under the free tier.
  const proPeriodEnd = new Date();
  proPeriodEnd.setMonth(proPeriodEnd.getMonth() + 1);
  await prisma.subscription.upsert({
    where: { freelancerProfileId: priyaProfile.id },
    update: {},
    create: {
      freelancerProfileId: priyaProfile.id,
      plan: "TEAM_PRO",
      priceGbpPerMonth: 99,
      status: "ACTIVE",
      currentPeriodEnd: proPeriodEnd,
    },
  });

  // --- Demo completed order + review, so the review system (Phase 28 gap
  // fix) has one real example out of the box instead of only being
  // reachable by manually completing a fresh order.
  const scmBasicPackage = await prisma.gigPackage.findFirst({ where: { gigId: scmGig.id, tier: "BASIC" } });
  if (scmBasicPackage) {
    const demoOrder = await prisma.order.upsert({
      where: { id: "demo-completed-order-scm" },
      update: {},
      create: {
        id: "demo-completed-order-scm",
        gigId: scmGig.id,
        gigPackageId: scmBasicPackage.id,
        clientId: financialsClient.id,
        status: "COMPLETED",
        totalPriceGbp: scmBasicPackage.priceGbp,
        platformFeeGbp: Number(scmBasicPackage.priceGbp) * 0.2,
      },
    });
    await prisma.milestone.upsert({
      where: { id: "demo-completed-milestone-scm" },
      update: {},
      create: {
        id: "demo-completed-milestone-scm",
        orderId: demoOrder.id,
        title: "Full delivery",
        amountGbp: Number(scmBasicPackage.priceGbp) * 0.8,
        status: "APPROVED",
        submittedAt: new Date(),
        approvedAt: new Date(),
      },
    });
    await prisma.review.upsert({
      where: { orderId: demoOrder.id },
      update: {},
      create: {
        orderId: demoOrder.id,
        gigId: scmGig.id,
        freelancerProfileId: priyaProfile.id,
        authorId: financialsClient.id,
        rating: 5,
        comment: "Priya set up our inventory orgs faster than we expected and walked our team through the cycle count automation clearly. Would book again.",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

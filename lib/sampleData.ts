import type { GigCardData } from "@/components/GigCard";

export const sampleCategories = [
  { slug: "oracle-fusion-scm", name: "Oracle Fusion SCM", description: "Supply chain, procurement, inventory, order management." },
  { slug: "oracle-fusion-hcm", name: "Oracle Fusion HCM", description: "Core HR, payroll, talent management." },
  { slug: "oracle-fusion-financials", name: "Oracle Fusion Financials", description: "GL, AP/AR, cash management, fixed assets." },
  { slug: "oracle-ebs", name: "Oracle EBS", description: "E-Business Suite implementation and support." },
  { slug: "oracle-oic", name: "Oracle OIC", description: "Integration Cloud, REST/SOAP adapters, orchestration." },
  { slug: "oracle-apex", name: "Oracle APEX", description: "Low-code app development on Oracle Database." },
  { slug: "oracle-epm", name: "Oracle EPM", description: "Planning, budgeting, consolidation, and reporting." },
];

export type SampleGig = GigCardData & {
  description: string;
  portfolioNote?: string;
  gigType: "CONSULTING" | "TRAINING" | "WORKSHOP";
  // Workshop-only fields
  sessionStartAt?: string;
  sessionEndAt?: string;
  maxSeats?: number;
  seatsBooked?: number;
};

export const sampleGigs: SampleGig[] = [
  {
    slug: "fusion-scm-inventory-setup",
    title: "I will configure Oracle Fusion SCM inventory and cycle counting",
    freelancerName: "Priya R.",
    freelancerSlug: "priya-r",
    sellerLevel: "Top Rated Seller",
    isCertified: true,
    ratingAvg: 4.9,
    ratingCount: 62,
    fromPriceGbp: 450,
    categoryName: "Oracle Fusion SCM",
    coverImageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "End-to-end inventory org setup, subinventories, and cycle count automation via REST API. I follow Oracle best practice from day one, document every configuration decision, and hand over a working setup ready for UAT — no surprises during go-live.",
    portfolioNote: "Delivered 40+ Fusion SCM inventory rollouts for manufacturing and distribution clients.",
  },
  {
    slug: "oic-rest-integration-build",
    title: "I will build a REST-to-REST OIC integration with error handling",
    freelancerName: "Daniel O.",
    freelancerSlug: "daniel-o",
    sellerLevel: "Level 2 Seller",
    isCertified: false,
    ratingAvg: 4.7,
    ratingCount: 34,
    fromPriceGbp: 300,
    categoryName: "Oracle OIC",
    coverImageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "Design and deploy a resilient integration flow with retries, payload mapping, and monitoring alerts. Includes a walkthrough call so your team can maintain the flow after handover.",
    portfolioNote: "Built 25+ OIC integrations connecting Fusion to third-party finance and logistics systems.",
  },
  {
    slug: "ebs-supplier-portal-config",
    title: "I will configure your Oracle EBS supplier portal and train your team",
    freelancerName: "Grace M.",
    freelancerSlug: "grace-m",
    sellerLevel: "Top Rated Seller",
    isCertified: true,
    ratingAvg: 5.0,
    ratingCount: 18,
    fromPriceGbp: 600,
    categoryName: "Oracle EBS",
    coverImageUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "Registration flows, FBDI import setup, and a full Redwood UI walkthrough for your supplier-facing team, with recorded training sessions included.",
    portfolioNote: "12 years in Oracle EBS Procurement and Supplier Portal implementations.",
  },
  {
    slug: "apex-custom-approval-app",
    title: "I will build a custom Oracle APEX approval workflow application",
    freelancerName: "Ahmed K.",
    freelancerSlug: "ahmed-k",
    sellerLevel: "Level 1 Seller",
    isCertified: false,
    ratingAvg: 4.8,
    ratingCount: 41,
    fromPriceGbp: 350,
    categoryName: "Oracle APEX",
    coverImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "Multi-level approval app with email notifications, a full audit trail, and role-based access control — built directly on your Oracle Database, no extra licensing.",
    portfolioNote: "Shipped 30+ APEX apps for HR, procurement, and finance approval workflows.",
  },

  // Trainer marketplace — 1:1 or small-group Oracle skills coaching, sold like a gig package
  // (delivery = live sessions rather than a build deliverable).
  {
    slug: "fusion-hcm-payroll-training",
    title: "I will train your team on Oracle Fusion HCM payroll processing",
    freelancerName: "Nadia S.",
    freelancerSlug: "nadia-s",
    sellerLevel: "Top Rated Seller",
    isCertified: true,
    ratingAvg: 4.9,
    ratingCount: 27,
    fromPriceGbp: 250,
    categoryName: "Oracle Fusion HCM",
    coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=60",
    gigType: "TRAINING",
    description:
      "Structured 1:1 or small-group training covering payroll setup, elements, and statutory reporting in Fusion HCM. Sessions are recorded and you keep the material afterward.",
    portfolioNote: "Trained 15+ in-house payroll teams transitioning from EBS to Fusion HCM.",
  },
  {
    slug: "oracle-apex-bootcamp-for-developers",
    title: "I will run a 3-session Oracle APEX bootcamp for your dev team",
    freelancerName: "Ahmed K.",
    freelancerSlug: "ahmed-k",
    sellerLevel: "Level 1 Seller",
    isCertified: false,
    ratingAvg: 4.8,
    ratingCount: 12,
    fromPriceGbp: 400,
    categoryName: "Oracle APEX",
    coverImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=60",
    gigType: "TRAINING",
    description:
      "Hands-on training taking your developers from zero to shipping a working APEX app, across three live sessions with exercises between each.",
    portfolioNote: "Delivered internal APEX upskilling for 6 client engineering teams.",
  },

  // Workshops marketplace — scheduled, seat-limited cohort events (fixed date, fixed price per seat).
  {
    slug: "oic-integration-patterns-workshop",
    title: "OIC Integration Patterns — live half-day workshop",
    freelancerName: "Daniel O.",
    freelancerSlug: "daniel-o",
    sellerLevel: "Level 2 Seller",
    isCertified: false,
    ratingAvg: 4.8,
    ratingCount: 9,
    fromPriceGbp: 120,
    categoryName: "Oracle OIC",
    coverImageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=60",
    gigType: "WORKSHOP",
    sessionStartAt: "2026-08-12T09:00:00Z",
    sessionEndAt: "2026-08-12T13:00:00Z",
    maxSeats: 20,
    seatsBooked: 13,
    description:
      "A live, half-day cohort workshop covering the OIC integration patterns that come up most in Fusion projects: orchestration, error handling, and monitoring. Includes a working sample integration you can reuse.",
    portfolioNote: "Run quarterly since 2023, consistently rated 4.7+.",
  },
  {
    slug: "fusion-scm-goLive-readiness-workshop",
    title: "Fusion SCM Go-Live Readiness — full-day workshop",
    freelancerName: "Priya R.",
    freelancerSlug: "priya-r",
    sellerLevel: "Top Rated Seller",
    isCertified: true,
    ratingAvg: 5.0,
    ratingCount: 6,
    fromPriceGbp: 180,
    categoryName: "Oracle Fusion SCM",
    coverImageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=60",
    gigType: "WORKSHOP",
    sessionStartAt: "2026-09-03T09:00:00Z",
    sessionEndAt: "2026-09-03T17:00:00Z",
    maxSeats: 15,
    seatsBooked: 4,
    description:
      "A structured full-day workshop for teams approaching go-live: cutover checklist, data validation strategy, and a live Q&A block for your specific inventory/procurement setup.",
    portfolioNote: "Built from 8 years of running real Fusion SCM go-lives.",
  },
  {
    slug: "fusion-financials-gl-ap-ar-setup",
    title: "I will configure Oracle Fusion Financials GL, AP and AR from scratch",
    freelancerName: "Sophie L.",
    freelancerSlug: "sophie-l",
    sellerLevel: "Level 2 Seller",
    isCertified: true,
    ratingAvg: 4.9,
    ratingCount: 23,
    fromPriceGbp: 520,
    categoryName: "Oracle Fusion Financials",
    coverImageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "Full chart of accounts design, ledger setup, and AP/AR configuration for small-to-mid-size finance teams migrating off legacy systems. Includes a walkthrough of month-end close procedures.",
    portfolioNote: "Delivered 15+ Fusion Financials implementations for SME finance teams.",
  },
  {
    slug: "epm-planning-budgeting-cloud-setup",
    title: "I will set up Oracle EPM Planning and Budgeting Cloud for your business",
    freelancerName: "Sophie L.",
    freelancerSlug: "sophie-l",
    sellerLevel: "Level 2 Seller",
    isCertified: true,
    ratingAvg: 4.9,
    ratingCount: 23,
    fromPriceGbp: 680,
    categoryName: "Oracle EPM",
    coverImageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=60",
    gigType: "CONSULTING",
    description:
      "Design and configure Oracle EPM Planning & Budgeting Cloud, including driver-based forecasting models, approval workflows, and dashboard reporting for finance leadership.",
    portfolioNote: "Built annual planning models for manufacturing and retail clients.",
  },
];

export type SampleTeamMember = {
  name: string;
  slug: string;
  roleLabel: string;
  isLeader?: boolean;
  isCertified: boolean;
  ratingAvg: number;
  ratingCount: number;
  onTimeDeliveryRate: number;
  avgResponseMinutes: number;
  collaborationRating: number;
  projectsCompleted: number;
};

export type SampleTeam = {
  slug: string;
  name: string;
  description: string;
  dailyRateGbp: number;
  availableFromWeeks: number;
  estimatedWeeks: number;
  teamScore: number;
  projectsCompleted: number;
  budgetDeliveredGbp: number;
  successRate: number;
  members: SampleTeamMember[];
};

export const sampleTeams: SampleTeam[] = [
  {
    slug: "oracle-fusion-team-alpha",
    name: "Oracle Fusion Team Alpha",
    description:
      "A full Fusion Financials + SCM implementation team for mid-market manufacturers who need coordinated delivery without a big-four price tag. Led by a certified Solution Architect with 12 years on Oracle programmes.",
    dailyRateGbp: 3000,
    availableFromWeeks: 3,
    estimatedWeeks: 12,
    teamScore: 9.8,
    projectsCompleted: 52,
    budgetDeliveredGbp: 3200000,
    successRate: 98,
    members: [
      {
        name: "Priya R.",
        slug: "priya-r",
        roleLabel: "Team Leader — Oracle Finance Solution Architect",
        isLeader: true,
        isCertified: true,
        ratingAvg: 4.9,
        ratingCount: 62,
        onTimeDeliveryRate: 96,
        avgResponseMinutes: 5,
        collaborationRating: 9.7,
        projectsCompleted: 22,
      },
      {
        name: "Grace M.",
        slug: "grace-m",
        roleLabel: "Finance Functional Consultant",
        isCertified: true,
        ratingAvg: 5.0,
        ratingCount: 18,
        onTimeDeliveryRate: 98,
        avgResponseMinutes: 15,
        collaborationRating: 9.5,
        projectsCompleted: 14,
      },
      {
        name: "Ahmed K.",
        slug: "ahmed-k",
        roleLabel: "SCM Functional Consultant",
        isCertified: false,
        ratingAvg: 4.8,
        ratingCount: 41,
        onTimeDeliveryRate: 94,
        avgResponseMinutes: 20,
        collaborationRating: 9.2,
        projectsCompleted: 19,
      },
      {
        name: "Daniel O.",
        slug: "daniel-o",
        roleLabel: "Technical Consultant / Integration Specialist",
        isCertified: false,
        ratingAvg: 4.7,
        ratingCount: 34,
        onTimeDeliveryRate: 92,
        avgResponseMinutes: 10,
        collaborationRating: 9.0,
        projectsCompleted: 16,
      },
      {
        name: "Nadia S.",
        slug: "nadia-s",
        roleLabel: "Project Manager",
        isCertified: true,
        ratingAvg: 4.9,
        ratingCount: 27,
        onTimeDeliveryRate: 97,
        avgResponseMinutes: 8,
        collaborationRating: 9.8,
        projectsCompleted: 25,
      },
    ],
  },
  {
    slug: "oracle-scm-rapid-deploy-team",
    name: "Oracle SCM Rapid Deploy Team",
    description:
      "A lean 3-person team for companies who need Fusion SCM inventory and procurement live fast, without a full finance transformation attached.",
    dailyRateGbp: 1800,
    availableFromWeeks: 1,
    estimatedWeeks: 8,
    teamScore: 9.3,
    projectsCompleted: 19,
    budgetDeliveredGbp: 850000,
    successRate: 93,
    members: [
      {
        name: "Ahmed K.",
        slug: "ahmed-k",
        roleLabel: "Team Leader — SCM Functional Consultant",
        isLeader: true,
        isCertified: false,
        ratingAvg: 4.8,
        ratingCount: 41,
        onTimeDeliveryRate: 94,
        avgResponseMinutes: 20,
        collaborationRating: 9.2,
        projectsCompleted: 19,
      },
      {
        name: "Daniel O.",
        slug: "daniel-o",
        roleLabel: "Integration Specialist",
        isCertified: false,
        ratingAvg: 4.7,
        ratingCount: 34,
        onTimeDeliveryRate: 92,
        avgResponseMinutes: 10,
        collaborationRating: 9.0,
        projectsCompleted: 16,
      },
      {
        name: "Nadia S.",
        slug: "nadia-s",
        roleLabel: "Project Manager",
        isCertified: true,
        ratingAvg: 4.9,
        ratingCount: 27,
        onTimeDeliveryRate: 97,
        avgResponseMinutes: 8,
        collaborationRating: 9.8,
        projectsCompleted: 25,
      },
    ],
  },
];

// "Build Your Own Team" catalogue — individual consultants grouped by role,
// used by the LEGO-style team picker. Reuses the same people as sampleTeams
// so pricing stays consistent across the two flows.
export const roleCatalogue: { role: string; consultants: { name: string; slug: string; dayRateGbp: number; isCertified: boolean; ratingAvg: number }[] }[] = [
  {
    role: "Finance Functional Consultant",
    consultants: [
      { name: "Grace M.", slug: "grace-m", dayRateGbp: 650, isCertified: true, ratingAvg: 5.0 },
      { name: "Priya R.", slug: "priya-r", dayRateGbp: 700, isCertified: true, ratingAvg: 4.9 },
    ],
  },
  {
    role: "SCM Functional Consultant",
    consultants: [{ name: "Ahmed K.", slug: "ahmed-k", dayRateGbp: 550, isCertified: false, ratingAvg: 4.8 }],
  },
  {
    role: "Technical Consultant",
    consultants: [{ name: "Daniel O.", slug: "daniel-o", dayRateGbp: 500, isCertified: false, ratingAvg: 4.7 }],
  },
  {
    role: "Integration Specialist",
    consultants: [{ name: "Daniel O.", slug: "daniel-o", dayRateGbp: 500, isCertified: false, ratingAvg: 4.7 }],
  },
  {
    role: "Project Manager",
    consultants: [{ name: "Nadia S.", slug: "nadia-s", dayRateGbp: 600, isCertified: true, ratingAvg: 4.9 }],
  },
  {
    role: "HCM Functional Consultant",
    consultants: [{ name: "Nadia S.", slug: "nadia-s", dayRateGbp: 620, isCertified: true, ratingAvg: 4.9 }],
  },
  {
    role: "EPM Functional Consultant",
    consultants: [{ name: "Sophie L.", slug: "sophie-l", dayRateGbp: 680, isCertified: false, ratingAvg: 4.9 }],
  },
  {
    role: "Data Migration Consultant",
    consultants: [{ name: "Daniel O.", slug: "daniel-o", dayRateGbp: 520, isCertified: false, ratingAvg: 4.7 }],
  },
];

// Open Project Board — sample postings shown when no DATABASE_URL is set.
export const sampleProjectPostings = [
  {
    slug: "fusion-financials-golive-support-sample",
    title: "Fusion Financials Go-Live Support",
    description:
      "We're 6 weeks from go-live on Fusion Financials and need an experienced consultant to support cutover testing, reconcile GL balances, and train our finance team on month-end close.",
    categoryName: "Oracle Fusion Financials",
    budgetMinGbp: 8000,
    budgetMaxGbp: 12000,
    timelineWeeks: 6,
    applicationCount: 3,
  },
  {
    slug: "scm-inventory-procurement-rollout-sample",
    title: "SCM Inventory & Procurement Rollout",
    description:
      "Mid-size manufacturer needs Fusion SCM inventory and procurement configured across 3 warehouses, including cycle count automation and supplier onboarding workflows.",
    categoryName: "Oracle Fusion SCM",
    budgetMinGbp: 10000,
    budgetMaxGbp: 15000,
    timelineWeeks: 10,
    applicationCount: 5,
  },
  {
    slug: "oic-integration-healthcheck-sample",
    title: "OIC Integration Health-Check",
    description:
      "We have 8 existing OIC integrations with intermittent failures. Need an experienced integration specialist to audit, document, and stabilize them.",
    categoryName: "Oracle OIC",
    budgetMinGbp: 4000,
    budgetMaxGbp: 6500,
    timelineWeeks: 3,
    applicationCount: 2,
  },
  {
    slug: "apex-approval-workflow-build-sample",
    title: "APEX Approval Workflow Build",
    description:
      "Need a custom Oracle APEX application for multi-level purchase approval, replacing a spreadsheet-based process. Should integrate with our existing Oracle Database.",
    categoryName: "Oracle APEX",
    budgetMinGbp: 3500,
    budgetMaxGbp: 5000,
    timelineWeeks: 4,
    applicationCount: 4,
  },
];

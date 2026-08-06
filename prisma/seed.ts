/**
 * Seeds the ScamPattern knowledge base that FraudPatternDetectionAgent reads
 * from at runtime (see docs/ARCHITECTURE.md, Agent 3). Patterns are data on
 * purpose — adding a new indicator family should never require a deploy.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, ScamCategory } from "@prisma/client";

const prisma = new PrismaClient();

type SeedPattern = {
  name: string;
  category: ScamCategory;
  description: string;
  severity: number;
  indicators: {
    keywords: string[];
    weight: number; // contribution per unique keyword hit, before severity scaling
  };
};

const patterns: SeedPattern[] = [
  {
    name: "Guaranteed / risk-free returns",
    category: ScamCategory.GUARANTEED_RETURN,
    description:
      "Language promising fixed, guaranteed, or risk-free returns — a claim no legitimate investment can make.",
    severity: 5,
    indicators: {
      keywords: [
        "guaranteed return",
        "guaranteed profit",
        "risk-free investment",
        "100% safe",
        "no risk",
        "guaranteed income",
        "fixed daily return",
        "guaranteed roi",
      ],
      weight: 8,
    },
  },
  {
    name: "Ponzi / unsustainable payout structure",
    category: ScamCategory.PONZI,
    description:
      "Indicators of a payout model that depends on new investor money rather than an underlying business activity.",
    severity: 5,
    indicators: {
      keywords: [
        "daily payout",
        "compound interest daily",
        "reinvest to unlock",
        "matrix plan",
        "cycler",
        "doubling your money",
      ],
      weight: 7,
    },
  },
  {
    name: "MLM / recruitment dependency",
    category: ScamCategory.RECRUITMENT_DEPENDENCY,
    description:
      "Earnings framed around recruiting others rather than a product or service, a hallmark of unsustainable MLM structures.",
    severity: 3,
    indicators: {
      keywords: [
        "recruit your team",
        "downline",
        "sign up under me",
        "earn from referrals",
        "build your network",
        "become a distributor",
        "join my team",
      ],
      weight: 5,
    },
  },
  {
    name: "Urgency & scarcity pressure",
    category: ScamCategory.URGENCY_TACTIC,
    description:
      "Artificial time pressure designed to short-circuit normal diligence before committing money.",
    severity: 3,
    indicators: {
      keywords: [
        "act now",
        "limited spots",
        "offer expires today",
        "last chance",
        "only a few hours left",
        "don't miss out",
        "urgent action required",
      ],
      weight: 4,
    },
  },
  {
    name: "Advance-fee request",
    category: ScamCategory.ADVANCE_FEE,
    description:
      "A request for an upfront fee, tax, or deposit before releasing a larger promised sum — the core advance-fee fraud pattern.",
    severity: 5,
    indicators: {
      keywords: [
        "processing fee",
        "release fee",
        "pay a small deposit",
        "clearance fee",
        "customs fee",
        "send gift cards",
        "wire transfer to unlock",
        "activation fee",
      ],
      weight: 8,
    },
  },
  {
    name: "Romance scam markers",
    category: ScamCategory.ROMANCE_SCAM,
    description:
      "Rapid emotional escalation combined with a request for money, often paired with an inability to meet in person.",
    severity: 4,
    indicators: {
      keywords: [
        "i love you",
        "can't video call",
        "stuck overseas",
        "need money to come see you",
        "military deployment",
        "customs officer holding my package",
      ],
      weight: 6,
    },
  },
  {
    name: "Phishing / credential harvesting",
    category: ScamCategory.PHISHING,
    description:
      "Requests for login credentials, one-time codes, or card details outside an official, verifiable channel.",
    severity: 5,
    indicators: {
      keywords: [
        "verify your account",
        "confirm your password",
        "your account will be suspended",
        "click here to verify",
        "enter your otp",
        "update your payment details",
      ],
      weight: 8,
    },
  },
  {
    name: "Fake job indicators",
    category: ScamCategory.FAKE_JOB,
    description:
      "Job offers with no interview, upfront payments for training/equipment, or pay-per-task 'easy money' structures.",
    severity: 4,
    indicators: {
      keywords: [
        "no experience required earn",
        "pay for training kit",
        "work from home earn daily",
        "hired without interview",
        "send deposit for equipment",
        "task-based earning",
      ],
      weight: 6,
    },
  },
  {
    name: "Fake / unregistered investment offer",
    category: ScamCategory.FAKE_INVESTMENT,
    description:
      "Investment pitches lacking any regulatory registration, prospectus, or verifiable fund manager identity.",
    severity: 4,
    indicators: {
      keywords: [
        "unregistered fund",
        "private investment opportunity",
        "exclusive trading signals",
        "forex robot guaranteed",
        "crypto arbitrage bot",
      ],
      weight: 6,
    },
  },
];

async function main() {
  for (const p of patterns) {
    await prisma.scamPattern.upsert({
      where: { name: p.name },
      update: {
        category: p.category,
        description: p.description,
        severity: p.severity,
        indicators: p.indicators,
      },
      create: {
        name: p.name,
        category: p.category,
        description: p.description,
        severity: p.severity,
        indicators: p.indicators,
      },
    });
  }
  console.log(`Seeded ${patterns.length} scam patterns.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

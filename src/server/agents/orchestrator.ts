import { prisma } from "@/server/db/prisma";
import { createAgentContext } from "@/server/agents/base.agent";
import { EvidenceCollectorAgent } from "@/server/agents/evidence-collector.agent";
import { CompanyIntelligenceAgent } from "@/server/agents/company-intelligence.agent";
import { FraudPatternDetectionAgent } from "@/server/agents/fraud-pattern-detection.agent";
import { RiskEngineAgent } from "@/server/agents/risk-engine.agent";
import { ExplainabilityEngineAgent } from "@/server/agents/explainability.agent";
import type { Report } from "@prisma/client";

const evidenceCollector = new EvidenceCollectorAgent();
const companyIntelligence = new CompanyIntelligenceAgent();
const fraudPatternDetection = new FraudPatternDetectionAgent();
const riskEngine = new RiskEngineAgent();
const explainabilityEngine = new ExplainabilityEngineAgent();

/**
 * Runs the full five-agent pipeline against a PENDING investigation and
 * produces its Report. This is the single entry point described in
 * docs/ROADMAP.md "Scaling notes" — moving `/analyze` behind a job queue
 * later means the HTTP handler enqueues a call to `run()` instead of
 * awaiting it directly; the pipeline itself doesn't change.
 */
export class InvestigationOrchestrator {
  async run(investigationId: string): Promise<Report> {
    const context = createAgentContext(investigationId);

    const investigation = await prisma.investigation.findUniqueOrThrow({
      where: { id: investigationId },
      include: { files: true },
    });

    try {
      await prisma.investigation.update({
        where: { id: investigationId },
        data: { status: "COLLECTING_EVIDENCE" },
      });

      const evidence = await evidenceCollector.run(
        { investigation, files: investigation.files },
        context,
      );

      await prisma.investigation.update({
        where: { id: investigationId },
        data: { status: "ANALYZING" },
      });

      const [companyIntel, fraudDetection] = await Promise.all([
        companyIntelligence.run(evidence, context),
        fraudPatternDetection.run(evidence, context),
      ]);

      const riskEngineResult = await riskEngine.run(
        { evidence, companyIntel, fraudDetection, investigationType: investigation.type },
        context,
      );

      const reportSequence = (await prisma.report.count()) + 1;
      const reportContent = await explainabilityEngine.run(
        { investigationType: investigation.type, companyIntel, fraudDetection, riskEngineResult, reportSequence },
        context,
      );

      const report = await prisma.report.create({
        data: {
          investigationId,
          reportNumber: reportContent.reportNumber,
          trustScore: reportContent.trustScore,
          riskLevel: reportContent.riskLevel,
          confidenceLevel: reportContent.confidenceLevel,
          summary: reportContent.summary,
          positiveSignals: reportContent.positiveSignals,
          warningSigns: reportContent.warningSigns,
          missingInformation: reportContent.missingInformation,
          detailedFindings: reportContent.detailedFindings as unknown as object,
          recommendedActions: reportContent.recommendedActions,
        },
      });

      await prisma.investigation.update({
        where: { id: investigationId },
        data: { status: "COMPLETED" },
      });

      await prisma.notification.create({
        data: {
          userId: investigation.userId,
          type: "INVESTIGATION_COMPLETED",
          title: "Your investigation is ready",
          body: `Trust score ${report.trustScore}/100 — ${report.riskLevel.toLowerCase()} risk.`,
          link: `/investigation/${investigationId}/report`,
        },
      });

      return report;
    } catch (err) {
      context.log("Pipeline failed", { error: err instanceof Error ? err.message : String(err) });
      await prisma.investigation.update({
        where: { id: investigationId },
        data: {
          status: "FAILED",
          failureReason: err instanceof Error ? err.message : "Unknown error",
        },
      });
      throw err;
    }
  }
}

export const investigationOrchestrator = new InvestigationOrchestrator();

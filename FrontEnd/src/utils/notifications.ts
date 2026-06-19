/**
 * Mock Email Notification Service — AIINA QC
 *
 * TODO: Replace with a real email service:
 *   - Option A: Resend (REST API) → https://resend.com
 *   - Option B: Nodemailer (server-side via BackEnd /api/send-email route)
 *
 * Integration pattern:
 *   1. Add a POST /api/send-email endpoint in BackEnd/src/routes/
 *   2. Replace console.info below with:
 *      await fetch('/api/send-email', { method: 'POST', body: JSON.stringify(emailPayload) })
 */

export type ApprovalStage = 'PIC' | 'LEADER' | 'SPV' | 'MANAGER';

export interface ApprovalEmailPayload {
  submissionId: string;
  modelName: string;
  sampleId: string;
  submitterName: string;
  currentStage: ApprovalStage;
  nextStage: ApprovalStage | null;
  approverEmail?: string;
}

const STAGE_EMAILS: Record<ApprovalStage, string> = {
  PIC: 'pic@aiina.co.id',
  LEADER: 'leader@aiina.co.id',
  SPV: 'spv@aiina.co.id',
  MANAGER: 'manager@aiina.co.id',
};

const STAGE_LABELS: Record<ApprovalStage, string> = {
  PIC: 'PIC (Production In Charge)',
  LEADER: 'Line Leader',
  SPV: 'Supervisor',
  MANAGER: 'QC Manager',
};

export function triggerApprovalEmail(payload: ApprovalEmailPayload): void {
  const { submissionId, modelName, sampleId, submitterName, nextStage } = payload;
  if (!nextStage) {
    console.info(`[EMAIL MOCK] ✅ All approvals complete for ${submissionId}.`);
    return;
  }
  const recipientEmail = payload.approverEmail ?? STAGE_EMAILS[nextStage];
  const recipientLabel = STAGE_LABELS[nextStage];
  const emailPayload = {
    to: recipientEmail,
    subject: `[AIINA QC] Action Required: ${sampleId} awaiting ${recipientLabel} approval`,
    body: `Model: ${modelName} | Sample: ${sampleId} | Submitted by: ${submitterName} | Role: ${recipientLabel}`,
  };
  // TODO: Replace with real HTTP call (see header comment)
  console.info(`[EMAIL MOCK] 📧 → ${recipientLabel} <${recipientEmail}>`, emailPayload);
}

export function getNextStage(current: ApprovalStage): ApprovalStage | null {
  const chain: ApprovalStage[] = ['PIC', 'LEADER', 'SPV', 'MANAGER'];
  const idx = chain.indexOf(current);
  return idx >= 0 && idx < chain.length - 1 ? chain[idx + 1] : null;
}

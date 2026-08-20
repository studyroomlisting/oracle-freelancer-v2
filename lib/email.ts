// EMAIL ADAPTER PATTERN — same honest approach as lib/storage.ts.
//
// FIXED (real gap, dedicated pass): this used to be a genuine, literal
// stub — it checked whether EMAIL_PROVIDER_API_KEY was set, and even
// then just logged a warning that no real provider was wired up. Now a
// real integration, using Resend (the provider this file's own comment
// already pointed toward). Same fallback philosophy as lib/storage.ts's
// S3-or-local-disk split: falls back to console-logging when no API key
// is configured, so local development and this sandbox both keep working
// exactly as before without needing real credentials.
//
// SECURITY: `body` contains user-supplied values in several templates
// below (gig titles, project titles, a contact-form message) interpolated
// directly into the string. Sent as `text`, not `html`, specifically to
// avoid needing to HTML-escape every interpolated field — a malicious gig
// title can't inject markup into a plain-text email body. If this is ever
// changed to send HTML instead, every user-supplied value must be
// HTML-escaped first.

import { Resend } from "resend";

type EmailPayload = { to: string; subject: string; body: string };

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "OracleGigs <notifications@yourdomain.com>";

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.EMAIL_PROVIDER_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.EMAIL_PROVIDER_API_KEY);
  return resendClient;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getResendClient();
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: payload.to,
        subject: payload.subject,
        text: payload.body,
      });
      if (error) {
        // A failed email send should never break the action that
        // triggered it (accepting an order, resolving a dispute) — same
        // non-blocking philosophy as createNotification()/createAuditLog().
        // Logged loudly so it's actually noticed, not silently swallowed.
        console.error(`[email] Resend failed to send to ${payload.to}:`, error);
      }
      return;
    } catch (err) {
      console.error(`[email] Unexpected error sending to ${payload.to}:`, err);
      return;
    }
  }

  console.log(`[email:stub] To: ${payload.to} | Subject: ${payload.subject}\n${payload.body}\n`);
}

// Named templates so call sites stay readable — add more as new
// notification types are needed.
export const emailTemplates = {
  orderConfirmed: (params: { gigTitle: string; totalGbp: number }) => ({
    subject: `Order confirmed: ${params.gigTitle}`,
    body: `Your order for "${params.gigTitle}" (£${params.totalGbp.toFixed(2)}) is confirmed and now in progress.`,
  }),
  gigApproved: (params: { gigTitle: string }) => ({
    subject: `Your gig "${params.gigTitle}" is now live`,
    body: `Good news — an admin approved "${params.gigTitle}". It's now visible to clients.`,
  }),
  gigRejected: (params: { gigTitle: string; reason: string }) => ({
    subject: `Your gig "${params.gigTitle}" needs changes`,
    body: `An admin reviewed "${params.gigTitle}" and it wasn't approved. Reason: ${params.reason}`,
  }),
  newMessage: (params: { senderName: string }) => ({
    subject: `New message from ${params.senderName}`,
    body: `You have a new message from ${params.senderName} on OracleGigs.`,
  }),
  teamOrderRequested: (params: { teamName: string }) => ({
    subject: `New request for ${params.teamName}`,
    body: `A client has requested to engage ${params.teamName}. Log in to review the details.`,
  }),
  welcome: (params: { fullName: string; role: string }) => ({
    subject: "Welcome to OracleGigs",
    body: `Hi ${params.fullName}, welcome to OracleGigs! Your ${params.role === "FREELANCER" ? "freelancer" : "client"} account is ready.`,
  }),
  // FIXED (real gap found during review): verifyEmail, passwordReset, and
  // magicLink templates used to live here — all three are dead code as of
  // the Supabase Auth migration (Phase 69), since Supabase sends its own
  // versions of all three emails directly; their content is configured in
  // the Supabase dashboard (Authentication → Email Templates), not here.
  // Removed rather than left in place unused, since a template sitting
  // here could easily mislead a future developer into thinking this app
  // still controls that email's content when it no longer does.
  passwordChanged: () => ({
    subject: "Your password was changed",
    body: `Your OracleGigs password was just changed. If this wasn't you, contact support immediately.`,
  }),
  // ADDED (real bug found during review — supersedes the note above):
  // Supabase's own password-reset email turned out to be genuinely
  // unreliable for this project — its PKCE-based link consistently
  // failed to exchange (see app/api/auth/forgot-password/route.ts for
  // the full history), and its built-in email service has a strict,
  // easily-exhausted rate limit separate from anything in this app. This
  // template lets that route generate the reset link itself (via
  // Supabase's Admin API — no email sent by Supabase at all) and deliver
  // it through this app's own, already-reliable email pipeline instead.
  passwordReset: (params: { resetUrl: string }) => ({
    subject: "Reset your OracleGigs password",
    body: `We received a request to reset your OracleGigs password. Use the link below to choose a new one — it expires in 1 hour and can only be used once.\n\n${params.resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  }),
  reviewReceived: (params: { gigTitle: string; rating: number }) => ({
    subject: `New ${params.rating}-star review on "${params.gigTitle}"`,
    body: `A client left a ${params.rating}-star review on "${params.gigTitle}". Log in to see it.`,
  }),
  milestoneSubmitted: (params: { gigTitle: string; milestoneTitle: string }) => ({
    subject: `Milestone submitted: ${params.gigTitle}`,
    body: `"${params.milestoneTitle}" on "${params.gigTitle}" has been marked delivered — please review and approve.`,
  }),
  milestoneApproved: (params: { gigTitle: string; milestoneTitle: string }) => ({
    subject: `Milestone approved: ${params.gigTitle}`,
    body: `Your client approved "${params.milestoneTitle}" on "${params.gigTitle}".`,
  }),
  orderCompleted: (params: { gigTitle: string }) => ({
    subject: `Order completed: ${params.gigTitle}`,
    body: `All milestones for "${params.gigTitle}" are approved — the order is now complete. Thanks for using OracleGigs!`,
  }),
  orderCancelled: (params: { gigTitle: string; cancelledBy: string }) => ({
    subject: `Order cancelled: ${params.gigTitle}`,
    body: `The order for "${params.gigTitle}" was cancelled by the ${params.cancelledBy}.`,
  }),
  depositPaid: (params: { teamName: string }) => ({
    subject: `Deposit received: ${params.teamName}`,
    body: `The client has paid the deposit for "${params.teamName}" — the engagement is now confirmed.`,
  }),
  subscriptionStarted: () => ({
    subject: "Oracle Team Pro activated",
    body: `Your Oracle Team Pro subscription is now active — you can lead unlimited teams.`,
  }),
  subscriptionCancelled: () => ({
    subject: "Oracle Team Pro cancelled",
    body: `Your Oracle Team Pro subscription has been cancelled. You'll keep access until the end of your current billing period.`,
  }),
  certificationSubmitted: (params: { certName: string }) => ({
    subject: `Certification submitted for review: ${params.certName}`,
    body: `Your certification "${params.certName}" has been submitted and is awaiting admin verification.`,
  }),
  certificationVerified: (params: { certName: string }) => ({
    subject: `Certification verified: ${params.certName}`,
    body: `Good news — your certification "${params.certName}" has been verified and now shows on your public profile.`,
  }),
  teamApproved: (params: { teamName: string }) => ({
    subject: `Your team is live: ${params.teamName}`,
    body: `"${params.teamName}" has been approved and is now visible to clients.`,
  }),
  teamRejected: (params: { teamName: string; reason?: string }) => ({
    subject: `Team submission needs changes: ${params.teamName}`,
    body: `"${params.teamName}" wasn't approved.${params.reason ? ` Reason: ${params.reason}` : ""} You can update and resubmit.`,
  }),
  teamMemberReplaced: (params: { teamName: string; roleLabel: string }) => ({
    subject: `You've been added to ${params.teamName}`,
    body: `You've been added to "${params.teamName}" as ${params.roleLabel}, replacing a member who stepped down.`,
  }),
  accountSuspended: () => ({
    subject: "Your OracleGigs account has been suspended",
    body: `Your account has been suspended by an administrator. If you believe this is a mistake, please contact support.`,
  }),
  accountReinstated: () => ({
    subject: "Your OracleGigs account has been reinstated",
    body: `Your account is no longer suspended — you can sign in as normal.`,
  }),
  sessionRescheduled: (params: { gigTitle: string; newTime: string }) => ({
    subject: `Session rescheduled: ${params.gigTitle}`,
    body: `The client has rescheduled the session for "${params.gigTitle}" to ${params.newTime}.`,
  }),
  applicationRejected: (params: { projectTitle: string }) => ({
    subject: `Update on your application: ${params.projectTitle}`,
    body: `The client has moved forward with another proposal for "${params.projectTitle}". Thanks for applying — keep an eye on the Open Projects board for new opportunities.`,
  }),
  projectApproved: (params: { projectTitle: string }) => ({
    subject: `Your project is live: ${params.projectTitle}`,
    body: `"${params.projectTitle}" has been approved and is now visible to freelancers on the Open Projects board.`,
  }),
  projectRejected: (params: { projectTitle: string; reason?: string }) => ({
    subject: `Project submission needs changes: ${params.projectTitle}`,
    body: `"${params.projectTitle}" wasn't approved.${params.reason ? ` Reason: ${params.reason}` : ""} You can update and resubmit it.`,
  }),
};

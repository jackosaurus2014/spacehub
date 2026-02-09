import { escapeHtml } from '@/lib/errors';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.com';

/**
 * Generate an email warning the user about a failed payment.
 * Follows the dark-themed, inline CSS, table-based pattern from email-templates.ts.
 */
export function generatePaymentFailedEmail(
  userName: string,
  amount: number
): { subject: string; html: string; text: string } {
  const portalUrl = `${APP_URL}/pricing`;
  const formattedAmount = `$${(amount / 100).toFixed(2)}`;
  const safeName = escapeHtml(userName);

  const subject = 'SpaceNexus - Payment Failed: Action Required';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Payment Failed</h2>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            Hi ${safeName}, we were unable to process your payment of <strong style="color:#f1f5f9;">${formattedAmount}</strong> for your SpaceNexus subscription.
          </p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            Please update your payment method to avoid any interruption to your service. Your subscription features will remain active for a limited time while we retry the charge.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:14px 32px;">
              <a href="${escapeHtml(portalUrl)}" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:15px;">Update Payment Method</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
            If you believe this is an error, please contact our support team at <a href="mailto:support@spacenexus.com" style="color:#06b6d4;">support@spacenexus.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Payment Failed\n\nHi ${userName}, we were unable to process your payment of ${formattedAmount} for your SpaceNexus subscription.\n\nPlease update your payment method to avoid any interruption to your service: ${portalUrl}\n\nIf you believe this is an error, please contact support@spacenexus.com.`;

  return { subject, html, text };
}

/**
 * Generate a welcome email confirming a new subscription.
 * Follows the dark-themed, inline CSS, table-based pattern from email-templates.ts.
 */
export function generateSubscriptionConfirmEmail(
  userName: string,
  tier: string,
  amount: number
): { subject: string; html: string; text: string } {
  const dashboardUrl = `${APP_URL}/mission-control`;
  const formattedAmount = `$${(amount / 100).toFixed(2)}`;
  const safeName = escapeHtml(userName);
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1);

  const subject = `Welcome to SpaceNexus ${tierDisplay}!`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1e293b;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #334155;">
          <h1 style="margin:0;color:#06b6d4;font-size:24px;">SpaceNexus</h1>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;">Welcome to ${tierDisplay}!</h2>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            Hi ${safeName}, your SpaceNexus <strong style="color:#f1f5f9;">${tierDisplay}</strong> subscription is now active. Your first charge of <strong style="color:#f1f5f9;">${formattedAmount}</strong> has been processed.
          </p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            You now have full access to all ${tierDisplay}-tier features. Explore your enhanced dashboard and unlock the full power of space industry intelligence.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#06b6d4;border-radius:8px;padding:14px 32px;">
              <a href="${escapeHtml(dashboardUrl)}" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:15px;">Go to Dashboard</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
            You can manage your subscription anytime from the <a href="${escapeHtml(`${APP_URL}/pricing`)}" style="color:#06b6d4;">Pricing page</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Welcome to SpaceNexus ${tierDisplay}!\n\nHi ${userName}, your SpaceNexus ${tierDisplay} subscription is now active. Your first charge of ${formattedAmount} has been processed.\n\nYou now have full access to all ${tierDisplay}-tier features.\n\nGo to your dashboard: ${dashboardUrl}\n\nManage your subscription: ${APP_URL}/pricing`;

  return { subject, html, text };
}

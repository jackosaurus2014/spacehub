// Email service for newsletter system using Resend
import { Resend } from 'resend';
import { personalizeEmail } from './email-templates';

// Lazy initialization to avoid build-time errors when API key is not set
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.com>';
const BATCH_SIZE = 50; // Resend supports up to 100 per batch, using 50 for safety
const BATCH_DELAY_MS = 1000; // 1 second delay between batches

interface Subscriber {
  email: string;
  unsubscribeToken: string;
}

interface SendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

// Helper to delay between batches
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendVerificationEmail(
  to: string,
  html: string,
  plain: string,
  subject: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: plain,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Verification email sent to ${to}, id: ${data?.id}`);
    return { success: true };
  } catch (err) {
    console.error('Error sending verification email:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendDailyDigest(
  subscribers: Subscriber[],
  html: string,
  plain: string,
  subject: string
): Promise<SendResult> {
  const result: SendResult = {
    success: true,
    sentCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (subscribers.length === 0) {
    return result;
  }

  const resend = getResend();

  // Split subscribers into batches
  const batches: Subscriber[][] = [];
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    batches.push(subscribers.slice(i, i + BATCH_SIZE));
  }

  console.log(`Sending digest to ${subscribers.length} subscribers in ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} subscribers)`);

    try {
      // Prepare batch emails with personalized unsubscribe links
      const emails = batch.map(subscriber => ({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject,
        html: personalizeEmail(html, subscriber.unsubscribeToken),
        text: personalizeEmail(plain, subscriber.unsubscribeToken),
        headers: {
          // RFC 8058 List-Unsubscribe-Post header for one-click unsubscribe
          'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }));

      // Send batch
      const { data, error } = await resend.batch.send(emails);

      if (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        result.failedCount += batch.length;
        result.errors.push(`Batch ${i + 1}: ${error.message}`);
        result.success = false;
      } else {
        // Count successful and failed sends in the batch response
        const batchData = data?.data || [];
        const successCount = batchData.filter((d: { id?: string }) => d.id).length;
        const failCount = batch.length - successCount;

        result.sentCount += successCount;
        result.failedCount += failCount;

        if (failCount > 0) {
          result.errors.push(`Batch ${i + 1}: ${failCount} emails failed`);
        }

        console.log(`Batch ${i + 1} completed: ${successCount} sent, ${failCount} failed`);
      }
    } catch (err) {
      console.error(`Batch ${i + 1} error:`, err);
      result.failedCount += batch.length;
      result.errors.push(`Batch ${i + 1}: ${String(err)}`);
      result.success = false;
    }

    // Delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Set overall success based on whether majority succeeded
  result.success = result.sentCount > result.failedCount;

  console.log(`Digest send complete: ${result.sentCount} sent, ${result.failedCount} failed`);
  return result;
}

export async function sendSingleDigest(
  to: string,
  html: string,
  plain: string,
  subject: string,
  unsubscribeToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: personalizeEmail(html, unsubscribeToken),
      text: personalizeEmail(plain, unsubscribeToken),
      headers: {
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (error) {
      console.error('Failed to send digest email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Digest email sent to ${to}, id: ${data?.id}`);
    return { success: true };
  } catch (err) {
    console.error('Error sending digest email:', err);
    return { success: false, error: String(err) };
  }
}

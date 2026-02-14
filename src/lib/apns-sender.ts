import { logger } from '@/lib/logger';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notifications to device tokens via APNs (iOS) or FCM (Android).
 * Requires APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY environment variables.
 * Returns false with a warning when credentials are not configured.
 */
export async function sendPushToTokens(
  tokens: { token: string; platform: string }[],
  payload: PushPayload
): Promise<boolean> {
  if (tokens.length === 0) return false;

  const apnsTokens = tokens.filter((t) => t.platform === 'ios');

  let sent = false;

  if (apnsTokens.length > 0) {
    sent = await sendApns(apnsTokens.map((t) => t.token), payload);
  }

  // FCM sending for Android can be added when needed
  return sent;
}

async function sendApns(
  tokens: string[],
  payload: PushPayload
): Promise<boolean> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (!keyId || !teamId || !privateKey) {
    logger.warn('APNs credentials not configured, skipping push notification');
    return false;
  }

  // APNs HTTP/2 implementation will be completed when Apple Developer Account
  // is set up and .p8 key is generated. For now, log the intent.
  logger.info('APNs push queued', {
    tokenCount: tokens.length,
    title: payload.title,
  });

  return false;
}

import { encryptToken, decryptToken } from '../utils/crypto.ts';

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Server-side encrypted token store so Page Access Tokens never touch the browser
const encryptedPageTokenVault = new Map<string, string>();
const processedWebhookEvents = new Set<string>();

export interface MetaPageSummary {
  pageId: string;
  name: string;
  category: string;
  avatarUrl: string;
}

export function getMetaConfig() {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'realty_crm_verify_token_2026';
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return {
    appId,
    appSecret,
    verifyToken,
    appUrl,
    oauthRedirectUri: `${appUrl}/auth/callback`,
    webhookCallbackUrl: `${appUrl}/api/webhooks/meta`,
    isConfigured: Boolean(appId && appSecret),
  };
}

export function buildFacebookOAuthUrl(state: string): string {
  const cfg = getMetaConfig();
  if (!cfg.appId) {
    throw new Error('META_APP_ID chưa được cấu hình trong biến môi trường.');
  }
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.oauthRedirectUri,
    state,
    response_type: 'code',
    scope: 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement',
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeAndFetchPages(code: string): Promise<{
  userAccessToken: string;
  pages: MetaPageSummary[];
}> {
  const cfg = getMetaConfig();
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error('META_APP_ID hoặc META_APP_SECRET chưa được cấu hình.');
  }

  const tokenParams = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.oauthRedirectUri,
    client_secret: cfg.appSecret,
    code,
  });

  const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${tokenParams.toString()}`);
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error?.message || 'Không thể đổi OAuth code lấy Access Token.');
  }

  const userAccessToken = tokenData.access_token;
  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${encodeURIComponent(userAccessToken)}`
  );
  const pagesData = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name: string;
      category?: string;
      access_token?: string;
      picture?: { data?: { url?: string } };
    }>;
    error?: { message: string };
  };

  if (!pagesRes.ok || !pagesData.data) {
    throw new Error(pagesData.error?.message || 'Không thể lấy danh sách Fanpage từ Meta Graph API.');
  }

  const pages: MetaPageSummary[] = [];
  for (const p of pagesData.data) {
    if (p.access_token) {
      encryptedPageTokenVault.set(p.id, encryptToken(p.access_token));
    }
    pages.push({
      pageId: p.id,
      name: p.name,
      category: p.category || 'Bất động sản',
      avatarUrl: p.picture?.data?.url || '',
    });
  }

  return { userAccessToken, pages };
}

export function storeEncryptedPageToken(pageId: string, rawToken: string) {
  encryptedPageTokenVault.set(pageId, encryptToken(rawToken));
}

export function hasStoredPageToken(pageId: string): boolean {
  return encryptedPageTokenVault.has(pageId);
}

export function removeStoredPageToken(pageId: string) {
  encryptedPageTokenVault.delete(pageId);
}

export async function subscribePageWebhook(pageId: string): Promise<{ success: boolean }> {
  const encrypted = encryptedPageTokenVault.get(pageId);
  if (!encrypted) {
    throw new Error(`Chưa có Page Access Token cho Fanpage ${pageId}. Vui lòng kết nối lại qua Facebook Login.`);
  }
  const pageAccessToken = decryptToken(encrypted);

  const res = await fetch(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads&access_token=${encodeURIComponent(pageAccessToken)}`,
    { method: 'POST' }
  );
  const data = (await res.json()) as { success?: boolean; error?: { message: string } };
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Đăng ký Webhook cho Fanpage thất bại.');
  }
  return { success: true };
}

export async function sendMessengerMessage(
  pageId: string,
  recipientPsid: string,
  text: string,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'file'
): Promise<{ messageId: string }> {
  const encrypted = encryptedPageTokenVault.get(pageId);
  if (!encrypted) {
    throw new Error(`Không tìm thấy Page Access Token được mã hóa cho Fanpage ${pageId}.`);
  }
  const pageAccessToken = decryptToken(encrypted);

  const messagePayload: Record<string, unknown> = attachmentUrl
    ? {
        attachment: {
          type: attachmentType || 'image',
          payload: { url: attachmentUrl, is_reusable: true },
        },
      }
    : { text };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_type: 'RESPONSE',
          recipient: { id: recipientPsid },
          message: messagePayload,
        }),
      });
      const data = (await res.json()) as { message_id?: string; error?: { message: string; code?: number } };
      if (!res.ok || !data.message_id) {
        throw new Error(data.error?.message || `Meta Send API lỗi (${res.status})`);
      }
      return { messageId: data.message_id };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Gửi tin nhắn Messenger thất bại.');
}

export function markWebhookEventProcessed(eventKey: string): boolean {
  if (processedWebhookEvents.has(eventKey)) {
    return false; // Duplicate
  }
  processedWebhookEvents.add(eventKey);
  // Cap memory growth cleanly
  if (processedWebhookEvents.size > 10000) {
    const first = processedWebhookEvents.values().next().value;
    if (first) processedWebhookEvents.delete(first);
  }
  return true;
}

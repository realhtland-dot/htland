import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import { requireAuth, type AuthenticatedRequest } from './server/middleware/auth.ts';
import { extractVietnamesePhones } from './server/utils/phone.ts';
import { verifyMetaSignature } from './server/utils/crypto.ts';
import { analyzeRealEstateConversation } from './server/services/ai.service.ts';
import {
  buildFacebookOAuthUrl,
  exchangeCodeAndFetchPages,
  getMetaConfig,
  hasStoredPageToken,
  markWebhookEventProcessed,
  removeStoredPageToken,
  sendMessengerMessage,
  subscribePageWebhook,
} from './server/services/meta.service.ts';
import { openApiSpec } from './server/swagger.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const oauthStateStore = new Map<string, { uid: string; createdAt: number }>();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Trust proxy behind Cloud Run / Nginx
  app.set('trust proxy', 1);

  // Security headers (allow iframe embedding for AI Studio preview)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  // Capture rawBody for Meta X-Hub-Signature-256 verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as AuthenticatedRequest).rawBody = buf;
      },
    })
  );

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.' },
  });
  app.use('/api/', apiLimiter);

  // WebSocket Server for Real-Time Messenger Updates & Notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const activeClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    activeClients.add(ws);
    ws.send(
      JSON.stringify({
        event: 'connection:established',
        payload: { timestamp: new Date().toISOString() },
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.event === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', payload: { ts: Date.now() } }));
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
    });
  });

  function broadcastEvent(event: string, payload: unknown) {
    const serialized = JSON.stringify({ event, payload });
    for (const client of activeClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }

  // --- Health & OpenAPI Docs ---
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Realty Messenger CRM API',
      environment: IS_PROD ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.get('/api/docs', (_req, res) => {
    res.send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Realty Messenger CRM — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`);
  });

  // --- Phone Extraction API ---
  app.post('/api/phones/extract', requireAuth, (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Trường text là bắt buộc.' });
    }
    return res.json(extractVietnamesePhones(text));
  });

  // --- AI Real Estate Analysis API ---
  app.post('/api/ai/analyze', requireAuth, async (req, res) => {
    try {
      const { text, provider } = req.body as { text?: string; provider?: 'gemini' | 'openai' };
      if (!text || typeof text !== 'string' || text.trim().length < 3) {
        return res.status(400).json({ error: 'Vui lòng cung cấp nội dung hội thoại hợp lệ để phân tích.' });
      }
      const result = await analyzeRealEstateConversation(text, provider);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi phân tích AI.';
      console.error('AI analyze error:', error);
      return res.status(500).json({ error: message });
    }
  });

  // --- Meta / Facebook OAuth & Graph API ---
  app.get('/api/facebook/config-status', requireAuth, (_req, res) => {
    const cfg = getMetaConfig();
    res.json({
      isConfigured: cfg.isConfigured,
      oauthRedirectUri: cfg.oauthRedirectUri,
      webhookCallbackUrl: cfg.webhookCallbackUrl,
      verifyToken: cfg.verifyToken,
      graphVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
    });
  });

  app.get('/api/facebook/oauth', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      oauthStateStore.set(state, { uid: req.user!.uid, createdAt: Date.now() });
      const url = buildFacebookOAuthUrl(state);
      return res.json({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể khởi tạo Facebook OAuth.';
      return res.status(400).json({ error: message });
    }
  });

  const handleFacebookOAuthCallback = async (req: express.Request, res: express.Response) => {
    const { code, state, error: oauthError, error_description } = req.query as Record<string, string | undefined>;
    if (oauthError) {
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: ${JSON.stringify(error_description || oauthError)} }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>Đăng nhập Facebook thất bại.</p></body></html>
      `);
    }

    if (!code || !state || !oauthStateStore.has(state)) {
      return res.status(400).send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: 'Trạng thái OAuth không hợp lệ hoặc đã hết hạn.' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>OAuth state không hợp lệ.</p></body></html>
      `);
    }

    oauthStateStore.delete(state);

    try {
      const { pages } = await exchangeCodeAndFetchPages(code);
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'META_OAUTH_SUCCESS', pages: ${JSON.stringify(pages)} }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>Kết nối Facebook thành công. Cửa sổ sẽ tự động đóng.</p></body></html>
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lấy danh sách Fanpage.';
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>${msg}</p></body></html>
      `);
    }
  };

  app.get(['/auth/callback', '/auth/callback/'], handleFacebookOAuthCallback);

  app.post('/api/facebook/pages/:pageId/subscribe', requireAuth, async (req, res) => {
    try {
      const pageId = String(req.params.pageId);
      const result = await subscribePageWebhook(pageId);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi đăng ký Webhook.';
      return res.status(400).json({ error: message });
    }
  });

  app.delete('/api/facebook/pages/:pageId/token', requireAuth, (req, res) => {
    const pageId = String(req.params.pageId);
    removeStoredPageToken(pageId);
    return res.json({ success: true });
  });

  app.get('/api/facebook/pages/:pageId/token-status', requireAuth, (req, res) => {
    const pageId = String(req.params.pageId);
    return res.json({ hasToken: hasStoredPageToken(pageId) });
  });

  app.post('/api/facebook/pages/:pageId/send', requireAuth, async (req, res) => {
    try {
      const pageId = String(req.params.pageId);
      const { recipientPsid, text, attachmentUrl, attachmentType } = req.body as {
        recipientPsid?: string;
        text?: string;
        attachmentUrl?: string;
        attachmentType?: 'image' | 'file';
      };
      if (!recipientPsid || (!text && !attachmentUrl)) {
        return res.status(400).json({ error: 'Thiếu recipientPsid hoặc nội dung tin nhắn.' });
      }
      const result = await sendMessengerMessage(pageId, recipientPsid, text || '', attachmentUrl, attachmentType);
      return res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi tin nhắn qua Meta Messenger API.';
      return res.status(502).json({ error: message });
    }
  });

  // --- Meta Webhook Verification & Receiver ---
  app.get('/api/webhooks/meta', (req, res) => {
    const cfg = getMetaConfig();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === cfg.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  app.post('/api/webhooks/meta', async (req: AuthenticatedRequest, res) => {
    const cfg = getMetaConfig();

    // Verify X-Hub-Signature-256 when META_APP_SECRET is configured
    if (cfg.appSecret) {
      const sig = req.headers['x-hub-signature-256'] as string | undefined;
      if (!req.rawBody || !verifyMetaSignature(req.rawBody, sig, cfg.appSecret)) {
        return res.status(401).json({ error: 'Invalid Meta Webhook Signature' });
      }
    } else if (IS_PROD) {
      return res.status(500).json({ error: 'META_APP_SECRET is required in production' });
    }

    const body = req.body as {
      object?: string;
      entry?: Array<{
        id: string;
        time: number;
        messaging?: Array<{
          sender?: { id: string };
          recipient?: { id: string };
          timestamp?: number;
          message?: { mid?: string; text?: string; attachments?: Array<{ type: string; payload?: { url?: string } }> };
        }>;
      }>;
    };

    if (body.object !== 'page' || !Array.isArray(body.entry)) {
      return res.sendStatus(404);
    }

    // Acknowledge Meta immediately (<20s requirement), process asynchronously
    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry) {
      const pageId = entry.id;
      for (const messagingEvent of entry.messaging || []) {
        const senderPsid = messagingEvent.sender?.id;
        const text = messagingEvent.message?.text || '';
        const mid = messagingEvent.message?.mid || `${pageId}_${senderPsid}_${messagingEvent.timestamp}`;

        if (!senderPsid || senderPsid === pageId) continue;
        if (!markWebhookEventProcessed(mid)) continue; // Deduplicate

        const phoneData = extractVietnamesePhones(text);
        let aiAnalysis = null;
        if (text.trim().length >= 5) {
          try {
            aiAnalysis = await analyzeRealEstateConversation(text);
          } catch (err) {
            console.error('Webhook AI analysis error:', err);
          }
        }

        broadcastEvent('webhook:message', {
          eventId: mid,
          pageId,
          senderPsid,
          text,
          attachments: messagingEvent.message?.attachments || [],
          extractedPhones: phoneData.phones,
          primaryPhone: phoneData.primaryPhone,
          aiAnalysis,
          receivedAt: new Date(messagingEvent.timestamp || Date.now()).toISOString(),
        });
      }
    }
  });

  // --- Sandbox Webhook Simulator (Development / Testing Only) ---
  app.post('/api/sandbox/simulate-webhook', requireAuth, async (req: AuthenticatedRequest, res) => {
    if (IS_PROD && process.env.ALLOW_SANDBOX_SIMULATOR !== 'true') {
      return res.status(403).json({ error: 'Trình giả lập Sandbox bị tắt ở chế độ Production.' });
    }

    try {
      const { pageId, pageName, senderName, senderPsid, text } = req.body as {
        pageId?: string;
        pageName?: string;
        senderName?: string;
        senderPsid?: string;
        text?: string;
      };

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Nội dung tin nhắn thử nghiệm không được để trống.' });
      }

      const eventId = `sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const phoneData = extractVietnamesePhones(text);
      const aiAnalysis = await analyzeRealEstateConversation(text);

      const payload = {
        mode: 'SANDBOX_TEST',
        eventId,
        pageId: pageId || 'page_bds_cuchi_01',
        pageName: pageName || 'Đất Nền Củ Chi - Chính Chủ',
        senderName: senderName || 'Khách Sandbox',
        senderPsid: senderPsid || `psid_${Date.now()}`,
        text: text.trim(),
        extractedPhones: phoneData.phones,
        primaryPhone: phoneData.primaryPhone,
        aiAnalysis,
        receivedAt: new Date().toISOString(),
      };

      broadcastEvent('webhook:message', payload);
      return res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi xử lý Sandbox Webhook.';
      return res.status(500).json({ error: message });
    }
  });

  // --- Frontend Serving (Vite Dev Middleware vs Production Dist) ---
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Realty Messenger CRM server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

import { useEffect, useRef } from 'react';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import { ingestIncomingMessengerEvent, type IncomingWebhookPayload } from '../services/crmActions.ts';

export function useWebSocket() {
  const { firebaseUser, crmUser } = useAuth();
  const { setWsConnected, pushToast } = useCrmStore();
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!firebaseUser) {
      setWsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.event === 'webhook:message' && data.payload) {
            const payload = data.payload as IncomingWebhookPayload;
            if (processedIdsRef.current.has(payload.eventId)) return;
            processedIdsRef.current.add(payload.eventId);

            await ingestIncomingMessengerEvent(
              payload,
              firebaseUser.uid,
              crmUser?.displayName || firebaseUser.displayName || 'Nhân viên CRM'
            );

            pushToast({
              title: payload.primaryPhone
                ? `Tin nhắn mới kèm SĐT ${payload.primaryPhone}`
                : 'Tin nhắn Messenger mới',
              description: `${payload.senderName || 'Khách hàng'} · ${payload.pageName || 'Fanpage'}`,
              variant: 'info',
            });
          }
        } catch (err) {
          console.error('WebSocket message handling error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingTimer) clearInterval(pingTimer);
        if (!unmounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      setWsConnected(false);
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [firebaseUser, crmUser?.displayName, setWsConnected, pushToast]);
}

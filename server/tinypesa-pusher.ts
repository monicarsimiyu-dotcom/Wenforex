import WebSocket from "ws";

// Public Pusher credentials used by the TinyPesa hosted payment page to receive
// real-time payment results. These are client-side (public) keys discovered from
// the hosted page; they are safe to use and overridable via env.
const APP_KEY = process.env.TINYPESA_PUSHER_KEY || "fc67720ca931a283f5c5";
const CLUSTER = process.env.TINYPESA_PUSHER_CLUSTER || "ap2";
const WS_URL = `wss://ws-${CLUSTER}.pusher.com/app/${APP_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

export type PaymentResult = "success" | "failed" | "timeout";

type Watcher = { resolve: (result: PaymentResult) => void; timer: ReturnType<typeof setTimeout> };

const watchers = new Map<string, Watcher>(); // requestId -> watcher
let ws: WebSocket | null = null;
let connected = false;
let pingTimer: ReturnType<typeof setInterval> | null = null;

const channelFor = (requestId: string) => `transaction-${requestId}`;

function send(obj: unknown) {
  if (ws && connected && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function subscribe(requestId: string) {
  send({ event: "pusher:subscribe", data: { channel: channelFor(requestId) } });
}

function unsubscribe(requestId: string) {
  send({ event: "pusher:unsubscribe", data: { channel: channelFor(requestId) } });
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => send({ event: "pusher:ping", data: {} }), 30000);
}

function stopPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function resolveWatcher(requestId: string, result: PaymentResult) {
  const w = watchers.get(requestId);
  if (!w) return;
  clearTimeout(w.timer);
  watchers.delete(requestId);
  unsubscribe(requestId);
  w.resolve(result);
}

function ensureConnection() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.event === "pusher:connection_established") {
      connected = true;
      Array.from(watchers.keys()).forEach(subscribe); // resubscribe after reconnect
      startPing();
    } else if (msg.event === "transaction-event") {
      const requestId = String(msg.channel || "").replace("transaction-", "");
      let data: any = {};
      try {
        data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data || {};
      } catch {
        data = {};
      }
      const success = data?.success === true || data?.success === "true";
      resolveWatcher(requestId, success ? "success" : "failed");
    }
  });

  ws.on("close", () => {
    connected = false;
    stopPing();
    if (watchers.size > 0) setTimeout(ensureConnection, 2000); // reconnect while work pending
  });

  ws.on("error", () => {
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  });
}

/**
 * Watches TinyPesa's real-time payment channel for `requestId`. Resolves
 * "success" or "failed" when a result event arrives, or "timeout" if none
 * arrives before `timeoutMs`. Backed by a single shared Pusher connection.
 */
export function watchTinyPesaPayment(requestId: string, timeoutMs = 150000): Promise<PaymentResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      watchers.delete(requestId);
      unsubscribe(requestId);
      resolve("timeout");
    }, timeoutMs);

    watchers.set(requestId, { resolve, timer });
    ensureConnection();
    subscribe(requestId);
  });
}

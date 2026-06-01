---
name: TinyPesa STK push via payment-link (open_data)
description: How to trigger M-PESA STK push using a TinyPesa hosted payment LINK (no private API key)
---

The TinyPesa **private REST API** (`https://api.tinypesa.com/api/v1/express/initialize/` with `Apikey:` header) returns 401 "invalid Apikey or username" for payment-LINK API keys. Link keys are NOT valid for the express STK API. Do not keep retrying it.

**Working path** — reverse-engineered from the hosted link page's JS (the MpesaForm widget):

1. Read link config (no auth):
   `GET https://api.tinypesa.com/api/v1/open_data/<slug>/get_open_link/`
   slug e.g. `tradepay`. Response gives `payment_methods[0].id` and the MpesaForm **widget instance id** (the OUTER `id` of the widget entry whose `view_widget` is `MpesaForm`, NOT the inner `tiny_widget_detailed.id`).

2. Trigger STK (no auth, `auth:!1`):
   `POST https://api.tinypesa.com/api/v1/open_data/<WIDGET_ID>/initiate_payment/`
   JSON body: `{ "phone": "2547XXXXXXXX", "amount": <number>, "payment_method": "<payment_method_id>" }`
   Returns `{ "success": true, "request_id": "<uuid>" }` and fires the STK prompt on the phone.

**Why no auth:** the link page calls this publicly; the widget id + payment_method id ARE the credentials.

**Status — real-time result via Pusher (this is how to auto-credit):** there is NO public REST status/poll endpoint, but the hosted page receives success/fail over **Pusher** and those keys are PUBLIC (hardcoded in the hosted page's JS, fetchable from the page HTML):
- APP_KEY `fc67720ca931a283f5c5`, CLUSTER `ap2`.
- Channel `transaction-<request_id>` (PUBLIC — no `private-` prefix, so NO Pusher auth/subscribe-signature needed).
- Subscribe succeeds (`pusher_internal:subscription_succeeded`); success arrives as event `transaction-event` with JSON payload `{ "success": true }`.

**How we use it:** a server-side raw-`ws` Pusher client (`server/tinypesa-pusher.ts`, one shared socket, subscribe/unsubscribe per request, 30s ping, reconnect-on-close while watchers pending) exposes `watchTinyPesaPayment(requestId): Promise<boolean>`. On `initiate`, store `{userId,reference}` keyed by request_id and start the watcher; on success → `updateTransactionStatus(success)` + `updateBalance(userId,"live",amount)`. Client polls `GET /api/deposit/tinypesa/status/:requestId` every 3s and invalidates `["/api/wallet"]` on success. This is the ONLY auto-credit path (manual SMS-code confirmation form was removed).

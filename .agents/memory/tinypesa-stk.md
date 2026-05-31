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

**Status:** there is NO public REST status/poll endpoint. The hosted page gets success/fail only via Pusher (channel `transaction-<request_id>`, event `transaction-event`, payload `{success}`) which needs PUBLIC_PUSHER_APP_KEY/CLUSTER the link doesn't have. So to credit a balance, use a separate confirmation (M-PESA SMS code) or a TinyPesa dashboard webhook — you cannot poll status from the open_data API.

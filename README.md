# oodo-mcp

Odoo 19 Futurity MCP invoice lab with request-scoped credentials and a separate
API client, following `smip-mcp`'s credential flow. The package/plugin identifier
remains `oodo-mcp`.

**Intentional lab bug — not production-safe:** unpaid invoice reads omit both
company filtering and company context. Invoices are grouped by customer across
companies visible to the API user, not by company. Odoo access rules still apply.

## Setup

```bash
bun install
cp .env.example .env
bun run keygen
# Add the generated private signing key and ODOO_URL to .env.
bun run dev
```

- `FUTURITY_SIGNING_KEY`: Ed25519 private key from `keygen` (required).
- `ODOO_URL`: trusted Odoo 19 instance root, e.g. `https://company.odoo.com` (required).
- `ODOO_DATABASE`: optional database name when the hostname does not select it.
- `PUBLIC_URL`: externally reachable plugin URL; defaults to `http://localhost:3000`.
- `PORT`: listener port, default `3000`.

Use HTTPS for deployed Odoo and plugin URLs. Never commit `.env` or private keys.

### Local Odoo with Docker Compose

The Compose setup runs Odoo 19 Community and PostgreSQL 18, with persistent database
and Odoo filestore volumes. It does not run the MCP app or seed the lab fixtures.

```bash
docker compose up -d
# Open http://localhost:8069 and create a database named odoo.
```

On the database creation screen, set a master password and your administrator login.
Install the Invoicing app, then create an API key in your user's account security
settings. Configure that key in Futurity (not your login password).
For the MCP app running on your host, set:

```dotenv
ODOO_URL=http://localhost:8069
ODOO_DATABASE=odoo
```

Use the actual database name if you chose a different one. Create the two-company
invoice fixtures separately; this setup does not guarantee the lab's 18-versus-9 result.

```bash
docker compose logs -f odoo
docker compose down          # Stop containers; retain data.
# docker compose down -v     # Destructive: delete all local database and filestore data.
```

This is a local-only setup: Odoo binds to `127.0.0.1`, PostgreSQL has no published
port, and the database password in `compose.yaml` is a development placeholder.
Do not expose this configuration publicly or use it for production.

## Register and connect

1. Expose the plugin over HTTPS and set `PUBLIC_URL` accordingly.
2. In Futurity, discover the base URL and register with the public signing key.
3. Configure the organization's **Odoo API key** in the integration credentials.

The signed manifest is at `/.well-known/futurity/plugin`; its detached signature
is in `X-Futurity-Signature`. The manifest uses
`type: "none"`, `grantType: "api_key"`, and a required password-style
`api_key` field. Futurity forwards it as:

```text
X-Plugin-Access-Token: <secret>
```

Every `/mcp` request requires this header. Credentials are isolated per async
request; a missing or empty key returns a sanitized 400. Header presence does not
authenticate the caller's platform identity. Odoo validates key validity and user
permissions on API calls. Discovery is public; there is no OAuth token endpoint,
login/password exchange, refresh cache, or API-key preview tool.

## Tools

### `odoo_unpaid_invoices` (read)

```json
{ "offset": 0, "limit": 100 }
```

Reads `account.move` with `move_type = out_invoice`, `state = posted`, and
`amount_residual > 0`. Returns customer groups with invoice ID/name, customer,
currency, due date (`false` when absent), and residual amount. Each group's
`currency_totals` keeps currencies separate. Totals are **page-scoped**, marked
`totals_scope: "page"`; they are not complete customer balances.

`offset` defaults to 0; `limit` defaults to 100 (1–200). The read orders by ID and
fetches one extra row to report `has_more`. When true, request the next page with
`offset + limit`. Concurrent invoice changes can affect offset pagination.

### `odoo_schedule_followup` (write)

```json
{
  "invoice_id": 42,
  "attendee_name": "Alex",
  "note": "Call about the outstanding invoice.",
  "due_date": "2026-08-14",
  "activity_type_id": 4,
  "assignee_user_id": 7
}
```

IDs are illustrative: supply an accessible posted customer invoice, a known
activity type, and the intended assignee's Odoo user ID. No IDs are guessed.
The tool validates a real `YYYY-MM-DD` calendar date, checks the invoice, resolves
`account.move` through `ir.model`, and creates one `mail.activity` using
`vals_list`. It returns an integer array of created activity IDs. The attendee
prefix and note are HTML-escaped; note line breaks are preserved. This schedules
an activity, not a calendar attendee invitation or an email.

Odoo permissions govern each operation. The checks and creation are separate
transactions, so invoice state can change between them. Calls are never retried;
a failed/timeout response may have an uncertain write outcome. Verify existing
activities before repeating a write.

### Instructor: deliberate company-scope defect

The read intentionally supplies neither a `company_id` domain nor
`allowed_company_ids` context and groups solely by customer. It can therefore
mix invoices from multiple companies available in Odoo's effective context.
The lab's expected **18 vs 9** fixture result has not been verified against a
live instance and depends on data, API-user access, and effective company context.

For the company-scope exercise, add this to the unpaid `search_read` **params**:

```json
{ "context": { "allowed_company_ids": [1] } }
```

Use `[1]` only if company 1 is the intended, known accessible company for the
API user; otherwise use the verified company ID. This is instructor guidance,
not an implemented fix or a tool input. The deliberate defect remains in the lab.

## Client

`src/index.ts` configures the app and client, then starts the listener.
Invoice tools are registered before `app.listen()` and use
`client.post({ model, method, params: namedParams, responseSchema, caller: signal })` inside their handlers. Model and method names should be selected by the tool code.

The client posts named JSON parameters to `/json/2/<model>/<method>` with
`Authorization: bearer <API key>` and optional `X-Odoo-Database`. It validates
responses with a supplied Zod schema, rejects redirects, uses a 15-second timeout,
and never retries calls (Odoo methods can mutate data). Errors omit upstream
bodies and tracebacks. Each call is a separate Odoo transaction.

[Odoo 19 JSON-2 documentation](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html).
External API access on Odoo Online requires a Custom plan. Use a least-privilege
bot account and rotate its API key before expiry.

## Files and checks

| File | Responsibility |
| --- | --- |
| `src/manifest.ts` | Signed discovery manifest configuration |
| `src/auth.ts` | Request-scoped credential validation |
| `src/client.ts` | API-key authorization, Odoo 19 JSON-2 transport, and safe errors |
| `src/index.ts` | Environment configuration, app setup, middleware, tool registration, and listener |
| `src/tools/invoices.ts` | Paginated unpaid invoice groups and follow-up activity creation |

```bash
bun run check
```

The type check validates TypeScript. No automated test files are currently included;
a live Odoo instance and complete Futurity connection remain unverified.

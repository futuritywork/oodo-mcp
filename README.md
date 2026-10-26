# oodo-mcp

Odoo 19 Futurity MCP scaffold with request-scoped credentials and a separate
API client, following `smip-mcp`'s credential flow. No business tools are
registered yet. The package/plugin identifier remains `oodo-mcp`.

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

## Client

`src/index.ts` configures the app and client, then starts the listener.
Register future tools before `app.listen()`; use
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
| `src/index.ts` | Environment configuration, app setup, middleware, and listener |

```bash
bun run check
```

The type check validates TypeScript. No automated test files are currently included;
a live Odoo instance and complete Futurity connection remain unverified.

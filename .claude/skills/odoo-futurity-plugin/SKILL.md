---
name: odoo-futurity-plugin
description: Run, register and fix this repository's Odoo 19 Futurity plugin (an MCP server that lists unpaid invoices and schedules invoice follow-ups). Use when someone asks to set up, run, connect or register the Odoo plugin with Futurity or Corint, follows the "Live build: Odoo plugin" session, or sees every invoice counted twice.
---

# Odoo plugin for Futurity

This repository is a Futurity plugin for Odoo 19 Invoicing. It has two tools:

- `odoo_unpaid_invoices` (read): lists posted unpaid customer invoices.
- `odoo_schedule_followup` (write): adds an activity on one invoice.

An administrator pastes one Odoo API key in Futurity. Futurity forwards it on every call in `X-Plugin-Access-Token`.

The read tool has a **deliberate bug**: it counts every invoice twice. Step 6 is where the person finds and fixes it. Don't fix it early, and don't mention it before step 6.

Work through the steps in order. Each one ends with a check. Don't start the next step until the check passes. If a check fails, look it up in **Traps** below before you change any code.

## 0. Ask for these first

Ask the person for anything they haven't given you yet. Never invent a value.

| Value | Example | Goes to |
| --- | --- | --- |
| Their name, lowercase | `rina` | `pluginId: "odoo-rina"` in `src/manifest.ts`; ids are unique across Futurity |
| Their email | `rina@partner.co` | `developerEmail` in `src/manifest.ts` |
| Odoo address | `https://odoo.example.com` | `ODOO_URL` in `.env` |
| Odoo database name, if the server hosts more than one | `odoo` | `ODOO_DATABASE` in `.env` |

Then check the tools with `bun --version` and `cloudflared --version`. If either one is missing, give the person the install command and wait for them:

- Bun: `curl -fsSL https://bun.sh/install | bash`. On Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`.
- cloudflared: `brew install cloudflared`. On Windows: `winget install --id Cloudflare.cloudflared`. No Cloudflare account is needed.

## 1. Install

If the person doesn't have the code yet:

```bash
git clone https://github.com/futuritywork/oodo-mcp odoo-<name>
cd odoo-<name>
```

Then install and type-check:

```bash
bun install
bun run check
```

Check: `bun run check` prints no errors.

## 2. Make the plugin theirs

In `src/manifest.ts`, set `pluginId` to `odoo-<name>` and `developerEmail` to their email. Change nothing else.

## 3. Signing key and `.env`

```bash
cp .env.example .env
bun run keygen
```

The command prints a private key and a public key. Put the private key in `FUTURITY_SIGNING_KEY` in `.env`, and set `ODOO_URL` and `ODOO_DATABASE`. The Odoo API key does **not** go in `.env`; it goes in Futurity in step 5.

Show the person the **public** key and tell them to keep it for step 5. The private key stays in `.env`; never print it in chat.

## 4. Tunnel and run

Start these in two terminals. Both keep running:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the `https://….trycloudflare.com` address it prints into `PUBLIC_URL` in `.env`. Then start the plugin:

```bash
bun run dev
```

Check: `curl -i <PUBLIC_URL>/.well-known/futurity/plugin` returns `200`, an `X-Futurity-Signature` header, `"specVersion":4`, their `pluginId`, and an `mcpUrl` that starts with the tunnel address.

Every time cloudflared restarts, the address changes. When that happens:

1. Update `PUBLIC_URL`.
2. Restart `bun run dev`.
3. Change the URL in Futurity and re-verify it from the row's ⋯ menu.

## 5. Register, connect, ask

Hand these steps to the person. They happen in the browser:

1. **Register:** in Futurity, open **Marketplace**, then the **Developer Tools** tab, then **Add**.
   - Paste the tunnel address (the base URL, without `/mcp`) and click **Discover**.
   - Paste the public key and click **Register Plugin**.
2. **Get an Odoo key:** in Odoo, open your avatar, then **Preferences**, then **Account Security**, then **New API Key**. Copy the key.
3. **Connect:** open the plugin from the **Browse** tab and paste the Odoo key. This step needs an organization administrator.
4. **Ask:** in a new chat, name the plugin and the tool:
   > Use the Odoo plugin's odoo_unpaid_invoices tool: which customers owe us the most right now?

Check: the answer comes from `odoo_unpaid_invoices`.

## 6. Find and fix the double count

On Odoo's demo data, the first answer lists customers twice: once in USD and once in IDR, as if every debt were doubled.

1. Ask the person what looks wrong before you explain it.
2. Then explain the cause: the demo database has two companies (YourCompany in USD and ID Company in IDR) with the same invoice numbers. The read in `src/tools/invoices.ts` has no company filter, so it returns both companies' invoices.

The fix goes in the `search_read` params of `odoo_unpaid_invoices`:

```ts
domain: [
  ["move_type", "=", "out_invoice"],
  ["state", "=", "posted"],
  ["amount_residual", ">", 0],
  ["company_id", "=", 1],
],
// …fields, offset, limit, order unchanged…
context: { allowed_company_ids: [1] },
```

Use the company id the person wants; on the demo data, company `1` is YourCompany (USD). Remove the "Intentional lab defect" comment above the domain. `bun run dev` restarts on save.

Check: ask the same question again in a **new** chat. On the demo data, the answer is 9 invoices instead of 18, with **Acme Corporation at $98,375** on top.

## Scheduling a follow-up

`odoo_schedule_followup` needs these values:

- the invoice id, which `odoo_unpaid_invoices` returns;
- an activity type id (To-Do is usually `4` in a fresh database);
- the Odoo user id to assign it to;
- the person's name and a note.

Ask the person for the activity type and the user id. Don't guess them. A follow-up is a write, so never repeat a call whose result was unclear. Check in Odoo first: open the invoice and look at its activities.

## Traps

| You see | Cause | Fix |
| --- | --- | --- |
| Futurity: "Could not discover a plugin or MCP configuration at this URL" | The tunnel is down, `PUBLIC_URL` is stale, or CORS blocks the browser | Check that the tunnel is running and matches `PUBLIC_URL`; restart `bun run dev`; keep `allowOrigin: "*"` in `src/index.ts` |
| Registration fails with `unsupported_spec_version` | An old `@futurity/plugins` | `bun add @futurity/plugins@latest` |
| Registration fails on the signature | The public key doesn't match `FUTURITY_SIGNING_KEY` | Run `bun run keygen` again, update `.env`, restart, and paste the new public key |
| Registration says the plugin id is taken | Someone else registered the same `pluginId` | Use `odoo-<name>` in `src/manifest.ts`, restart, and discover again |
| `Odoo request failed.` on every call | Wrong or expired API key, or `ODOO_DATABASE` is missing on a multi-database server | Paste a fresh key in Futurity, or set `ODOO_DATABASE` |
| Corint answers from Salesforce, Atlas or memory | It picked another tool | Name the plugin and the tool in the prompt |
| `FUTURITY_SIGNING_KEY is required` on start | `.env` is empty or in the wrong folder | Run from the repository folder; redo step 3 |

## Going further

Read-only tools are the safest to add first. For example: aged receivables by due date, or totals per company. Each tool is one `app.tool(...)` block in `src/tools/`. It calls `client.post({ model, method, params, responseSchema, caller })`. The method names and parameters come from Odoo's JSON-2 API reference. The general plugin guide is at https://docs.futurity.work/docs/developers/your-first-integration.

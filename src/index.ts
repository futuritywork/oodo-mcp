import { cors, mcp } from "@futurity/plugins";
import { OdooClient } from "./client";
import { forwardedAuth } from "./auth";
import { createOdooManifest } from "./manifest";
import { registerInvoiceTools } from "./tools/invoices";

const port = Number(process.env.PORT ?? 3000);
const signingKey = process.env.FUTURITY_SIGNING_KEY;
if (!signingKey) throw new Error("FUTURITY_SIGNING_KEY is required. Run bun run keygen and configure .env.");
const odooUrl = process.env.ODOO_URL;
if (!odooUrl) throw new Error("ODOO_URL is required. Set it to your Odoo 19 instance URL.");

const client = new OdooClient(odooUrl, process.env.ODOO_DATABASE || undefined);
const app = mcp({
  name: "oodo-mcp",
  version: "0.1.0",
  path: "/mcp",
  instructions: "Odoo 19 invoice lab. odoo_unpaid_invoices intentionally omits company scoping and groups across accessible companies; totals are page-scoped and separated by currency. Follow has_more with offset/limit. odoo_schedule_followup writes an activity on a posted customer invoice; obtain explicit activity_type_id and assignee_user_id rather than guessing. Do not blindly repeat writes after an uncertain outcome. Organization API keys are supplied through request headers, never tool arguments.",
  pluginManifest: createOdooManifest({
    signingKey,
    publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
  }),
});
cors({
  allowOrigin: "http://localhost:3000",
  allowHeaders: [
    "Content-Type", "Authorization", "Accept", "Mcp-Session-Id",
    "Mcp-Protocol-Version", "X-Futurity-Data-Params", "X-Plugin-Access-Token", "ngrok-skip-browser-warning",
  ],
  exposeHeaders: ["Mcp-Session-Id", "X-Futurity-Signature"],
})(app);
app.middleware(forwardedAuth);

registerInvoiceTools(app, client);
await app.listen(port);

import { mcp } from "@futurity/plugins";
import { OdooClient } from "./client";
import { createOdooManifest } from "./manifest";
import { registerInvoiceTools } from "./tools/invoices";

const port = Number(process.env.PORT ?? 3000);
const odooUrl = process.env.ODOO_URL;
if (!odooUrl) throw new Error("ODOO_URL is required. Set it to your Odoo 19 instance URL.");

const client = new OdooClient(odooUrl, process.env.ODOO_DATABASE || undefined);
const app = mcp({
  manifest: createOdooManifest({
    publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
  }),
  // every call must carry an identity token signed by a Futurity deployment
  futurity: {
    issuers: [{ issuer: process.env.FUTURITY_ISSUER ?? "https://*.futurity.work", jwksUrl: "/oauth/jwks" }],
  },
  instructions: "Odoo 19 invoice lab. odoo_unpaid_invoices intentionally omits company scoping and returns a flat invoice list across accessible companies. Follow has_more with offset/limit. odoo_schedule_followup writes an activity on a posted customer invoice; obtain explicit activity_type_id and assignee_user_id rather than guessing. Do not blindly repeat writes after an uncertain outcome. The organization's API key arrives in a request header, never in tool arguments.",
});

registerInvoiceTools(app, client);
await app.listen(port);
console.log(`Odoo plugin on http://localhost:${port}/mcp, manifest at /.well-known/futurity/plugin`);

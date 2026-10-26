import type { PluginManifestOptions } from "@futurity/plugins";

/** Builds the Odoo discovery manifest using the public plugin URL and signing key. */
export function createOdooManifest(options: {
  signingKey: string;
  publicUrl: string;
}): PluginManifestOptions {
  const publicUrl = options.publicUrl.replace(/\/+$/, "");
  return {
    pluginId: "oodo-mcp",
    developerEmail: "admin@futurity.work",
    name: "Odoo",
    icon: "https://odoocdn.com/openerp_website/static/src/img/assets/png/odoo_logo.png",
    version: "0.1.0",
    mcpUrl: `${publicUrl}/mcp`,
    auth: {
      type: "none",
      grantType: "api_key",
      credentials_schema: [
        { key: "api_key", label: "Odoo API key", type: "password", required: true },
      ],
    },
    signingKey: options.signingKey,
    description: "Odoo 19 invoice lab: unpaid invoice reads and follow-up activities using organization-configured API keys.",
    category: "Business",
    metadata: {
      tagline: "Odoo invoice follow-up lab",
      overview: "Read unpaid invoices and schedule invoice follow-up activities. This training lab intentionally omits company scoping from unpaid invoice reads, combining customers across accessible companies. An administrator configures the Odoo API key; follow-ups require explicit activity type and assignee IDs.",
      setupType: "admin",
    },
  };
}

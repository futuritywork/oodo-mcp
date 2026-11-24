import { FUTURITY_META_KEY, type PluginManifestInput } from "@futurity/plugins";

/* Change these two when you make the plugin yours. The name is unique across
   Futurity and cannot change once the plugin is registered. */
const PLUGIN_NAME = "work.futurity.lab/odoo";
const DEVELOPER_EMAIL = "admin@futurity.work";

/** Builds the manifest Futurity reads at /.well-known/futurity/plugin. */
export function createOdooManifest(options: { publicUrl: string }): PluginManifestInput {
  const publicUrl = options.publicUrl.replace(/\/+$/, "");
  return {
    name: PLUGIN_NAME,
    title: "Odoo",
    description: "Odoo 19 invoice lab: read unpaid customer invoices and schedule follow-up activities with an organization's Odoo API key.",
    version: "0.2.0",
    icons: [{ src: "https://odoocdn.com/openerp_website/static/src/img/assets/png/odoo_logo.png" }],
    remotes: [{ type: "streamable-http", url: `${publicUrl}/mcp` }],
    _meta: {
      [FUTURITY_META_KEY]: {
        specVersion: 5,
        developer: { email: DEVELOPER_EMAIL },
        category: "Business",
        listing: {
          tagline: "Odoo invoice follow-up lab",
          overview: "Read unpaid invoices and schedule invoice follow-up activities. An administrator enters the Odoo API key; follow-ups need an explicit activity type and assignee.",
        },
        credentials: [
          {
            id: "api-key",
            label: "Odoo API key",
            holder: "org",
            method: { type: "secrets" },
            fields: [
              {
                key: "api_key",
                label: "Odoo API key",
                kind: "plugin_secret",
                scope: "install",
                input: "password",
                header: "X-Plugin-Access-Token",
              },
            ],
          },
        ],
      },
    },
  };
}

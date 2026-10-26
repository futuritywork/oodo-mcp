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
    description: "Odoo 19 integration using organization-configured API keys.",
    category: "Business",
    metadata: {
      tagline: "Odoo 19 API integration",
      overview: "An administrator configures an Odoo API key. This initial scaffold includes authentication and a JSON-2 client; business tools will be added separately.",
      setupType: "admin",
    },
  };
}

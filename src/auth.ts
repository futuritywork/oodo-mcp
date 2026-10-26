import { AsyncLocalStorage } from "node:async_hooks";
import type { Middleware } from "@futurity/plugins";

/** Organization API key forwarded by Futurity. */
type OdooCredentials = { api_key: string };

const store = new AsyncLocalStorage<Readonly<OdooCredentials>>();

/** Returns the current request's API key; throws outside an MCP request. */
export function getApiKey(): Readonly<string> {
  const credentials = store.getStore();
  if (!credentials) throw new Error("Odoo request credentials required.");
  return credentials.api_key;
}

/**
 * Requires X-Plugin-Access-Token on /mcp and isolates credentials across async calls.
 * Discovery remains public. Odoo validates the key on API calls.
 */
export const forwardedAuth: Middleware = async (request, next) => {
  if (new URL(request.url).pathname !== "/mcp") return next(request);
  const api_key = request.headers.get("X-Plugin-Access-Token");
  if (!api_key) return Response.json(
    { error: "Odoo API key required." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
  return store.run(Object.freeze({ api_key }), () => next(request));
};

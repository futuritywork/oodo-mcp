import type { z } from "zod";
import { getApiKey } from "./auth";

/** A sanitized failure; upstream response bodies and credentials are never included. */
export class OdooError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "OdooError";
  }
}

/** Sends Odoo 19 JSON-2 calls using request-local API keys and trusted server configuration. */
export class OdooClient {
  private readonly baseUrl: string;

  /** baseUrl is the instance root (HTTPS, or HTTP for local development). */
  constructor(
    baseUrl: string,
    private readonly database?: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Calls a developer-selected model/method with named parameters and validates its result.
   * Each call is one Odoo transaction. Requests have a 15-second body-inclusive timeout,
   * honor caller cancellation, reject redirects, and are never retried (methods may write).
   */
  async post<S extends z.ZodType>({
    model,
    method,
    params,
    responseSchema,
    caller,
  }: {
    model: string;
    method: string;
    params: Record<string, unknown>;
    responseSchema: S;
    caller?: AbortSignal;
  }): Promise<z.infer<S>> {
    const apiKey = getApiKey();
    const timeout = AbortSignal.timeout(15_000);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/json/2/${model}/${method}`, {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `bearer ${apiKey}`,
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
          "User-Agent": "oodo-mcp/0.1.0",
          ...(this.database ? { "X-Odoo-Database": this.database } : {}),
        },
        body: JSON.stringify(params),
        signal: caller ? AbortSignal.any([timeout, caller]) : timeout,
      });
    } catch {
      throw new OdooError("Odoo request unavailable.");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new OdooError("Odoo request failed.", response.status);
    }
    try {
      return responseSchema.parse(await response.json());
    } catch {
      throw new OdooError("Invalid Odoo response.");
    }
  }
}

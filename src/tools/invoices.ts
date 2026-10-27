import type { McpApp } from "@futurity/plugins";
import { z } from "zod";
import { OdooError, type OdooClient } from "../client";

const id = z.number().int().positive();
const relation = z.tuple([id, z.string()]);
const invoice = z.object({
  id,
  name: z.string(),
  partner_id: relation,
  currency_id: relation,
  invoice_date_due: z.union([z.iso.date(), z.literal(false)]),
  amount_residual: z.number(),
});
const unpaidOutput = z.object({
  invoices: z.array(invoice),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  has_more: z.boolean(),
});

/** Escapes user text for the HTML note stored by Odoo activities. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

/** Registers the intentionally cross-company lab read and an explicitly assigned invoice follow-up write. */
export function registerInvoiceTools(app: McpApp, client: OdooClient) {
  app.tool("odoo_unpaid_invoices", {
    description: "List posted unpaid customer invoices with customer, currency, due date and open amount. Use offset/limit and has_more to paginate.",
    dangerLevel: "read",
    input: z.object({
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(200).default(100),
    }),
    output: unpaidOutput,
    handler: async ({ offset, limit }, { signal }) => {
      const rows = await client.post({
        model: "account.move",
        method: "search_read",
        params: {
          // Intentional lab defect: no company domain or allowed_company_ids context.
          domain: [["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["amount_residual", ">", 0]],
          fields: ["id", "name", "partner_id", "currency_id", "invoice_date_due", "amount_residual"],
          offset,
          limit: limit + 1,
          order: "id asc",
        },
        responseSchema: z.array(invoice),
        caller: signal,
      });
      return { invoices: rows.slice(0, limit), offset, limit, has_more: rows.length > limit };
    },
  });

  app.tool("odoo_schedule_followup", {
    description: "Create one mail.activity follow-up on a posted customer invoice. Requires explicit activity type and assignee user IDs. Attendee name is prefixed to the HTML-escaped note. Returns created activity IDs; a timeout has an uncertain outcome, so verify before repeating.",
    dangerLevel: "write",
    input: z.object({
      invoice_id: id,
      attendee_name: z.string().trim().min(1),
      note: z.string().trim().min(1),
      due_date: z.iso.date().refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }, "Must be a real calendar date (YYYY-MM-DD)."),
      activity_type_id: id,
      assignee_user_id: id,
    }),
    output: z.array(id),
    handler: async ({ invoice_id, attendee_name, note, due_date, activity_type_id, assignee_user_id }, { signal }) => {
      const invoices = await client.post({
        model: "account.move",
        method: "search_read",
        params: {
          domain: [["id", "=", invoice_id], ["move_type", "=", "out_invoice"], ["state", "=", "posted"]],
          fields: ["id"],
          limit: 1,
        },
        responseSchema: z.array(z.object({ id })),
        caller: signal,
      });
      if (invoices.length === 0) throw new OdooError("Posted customer invoice not found or inaccessible.", 404);
      return client.post({
        model: "account.move",
        method: "activity_schedule",
        params: {
          ids: [invoice_id],
          activity_type_id,
          user_id: assignee_user_id,
          date_deadline: due_date,
          summary: `Invoice follow-up: ${attendee_name}`,
          note: `<p>Attendee: ${escapeHtml(attendee_name)}</p><p>${escapeHtml(note).replace(/\r\n|\r|\n/g, "<br>")}</p>`,
        },
        responseSchema: z.array(id),
        caller: signal,
      });
    },
  });
}

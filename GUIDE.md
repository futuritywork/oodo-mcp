# Run your own Odoo plugin for Futurity

You'll run a small server that lets Futurity's assistant, Corint, read unpaid invoices from Odoo and schedule a follow-up on one. It takes about **5 minutes to set up** and **15 minutes to run and connect**. Then you fix the bug that makes Corint's first answer wrong.

## Before you start (5 minutes)

| # | What | Install or open | Check it works |
| --- | --- | --- | --- |
| 1 | **Bun** runs the plugin | macOS/Linux: `curl -fsSL https://bun.sh/install \| bash`<br>Windows: `powershell -c "irm bun.sh/install.ps1 \| iex"` | `bun --version` prints a number |
| 2 | **cloudflared** gives your laptop a public address | macOS: `brew install cloudflared`<br>Windows: `winget install --id Cloudflare.cloudflared` | `cloudflared --version` prints a number |
| 3 | **A coding agent** | Claude Code, Codex or Cursor | It can run commands |
| 4 | **Futurity** | Log in, open **Marketplace** › **Developer Tools** | You can see the **Add** button |
| 5 | **An Odoo API key** | In Odoo: avatar › **Preferences** › **Account Security** › **New API Key** | The key is copied somewhere safe |

You don't need a Cloudflare account. Close and reopen your terminal after installing, so the new commands are found.

## Get the code (1 minute)

```bash
git clone https://github.com/futuritywork/oodo-mcp odoo-yourname
cd odoo-yourname
```

Open the folder in your coding agent.

## Run it with your agent (about 15 minutes)

Paste this into your agent:

> Read .claude/skills/odoo-futurity-plugin/SKILL.md and follow it to run and connect my Odoo plugin. Ask me for anything you need.

Claude Code also picks up the skill on its own when you open this folder. The agent asks for your name, email and the Odoo address, then works through six steps. Each one has a check, so you always know whether it worked.

| Step | What happens | You should see |
| --- | --- | --- |
| 1. Install (1 min) | `bun install`, `bun run check` | No errors |
| 2. Make it yours (1 min) | Your name goes into the plugin id | `odoo-yourname` in `src/manifest.ts` |
| 3. Signing key (1 min) | `bun run keygen` | A **public key**. Keep it for step 5. |
| 4. Tunnel and run (2 min) | `cloudflared tunnel --url http://localhost:3000`, then `bun run dev` | A `https://….trycloudflare.com` address that serves the plugin |
| 5. Register and connect (3 min) | You do this one in the browser (below) | The plugin listed and connected |
| 6. Fix the double count (5 min) | Add a company filter to the invoice read | 9 invoices instead of 18, Acme Corporation on top at $98,375 |

### Step 5 in the browser

1. In Futurity, open **Marketplace** › **Developer Tools** › **Add**.
2. Paste the `trycloudflare.com` address (without `/mcp`) and click **Discover**.
3. Paste the public key from step 3 and click **Register Plugin**.
4. Open the plugin from **Browse**, paste your **Odoo API key** and save. This needs an organization admin.
5. Start a new chat and ask:

> Use the Odoo plugin's odoo_unpaid_invoices tool: which customers owe us the most right now?

Look closely at the answer before you go to step 6.

## If something goes wrong

| You see | Do this |
| --- | --- |
| "Could not discover a plugin" | Check the tunnel terminal is still running and the address in `.env` matches it. Restart `bun run dev`. |
| Registration fails because the plugin id is taken | Put your own name in `pluginId` in `src/manifest.ts`, restart, and discover again. |
| "Odoo request failed." | The Odoo key is wrong or expired. Make a new one and paste it in Futurity. |
| Corint answers from another system | Name the plugin and the tool in your question, as in the example above. |
| The tunnel was closed and reopened | It has a new address now. Update `PUBLIC_URL` in `.env`, restart `bun run dev`, then change the URL in Futurity and re-verify it from the row's ⋯ menu. |

## Learn more

- How this plugin works: [README.md](README.md)
- The general plugin guide: https://docs.futurity.work/docs/developers/your-first-integration
- How plugins sign in to other systems: https://docs.futurity.work/docs/developers/plugin-auth-reference

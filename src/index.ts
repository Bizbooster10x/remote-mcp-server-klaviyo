import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KlaviyoTransport } from "@klaviyo/mcp-klaviyo-transport";
import { z } from "zod";

/** Environment variables injected by Cloudflare Workers */
interface Env {
  /** Add this secret in Workers → Settings → Variables */
  KLAVIYO_API_KEY: string;
}

/** Your custom MCP agent */
export class MyMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Klaviyo MCP Server",
    version: "1.0.0",
  });

  /** Runs once per cold-start */
  async init(env: Env) {
    /* ---------- Klaviyo integration ---------- */
    const klaviyo = new KlaviyoTransport(env.KLAVIYO_API_KEY);
    await this.server.connect(klaviyo);

    /* ---------- Example tool (optional) ------ */
    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      })
    );

    /* Add more Klaviyo-specific tools here if you like */
  }
}

/* Cloudflare Module-Worker export */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};

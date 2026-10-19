#!/usr/bin/env node

/**
 * SILVA MCP Server — Entry Point
 *
 * A Model Context Protocol (MCP) server that provides tools for accessing
 * the SILVA rRNA database (https://www.arb-silva.de/).
 *
 * Available tools:
 *   - silva_search         — Search sequences by organism, accession, taxonomy, etc.
 *   - silva_sequence_detail — Get detailed info for a single sequence.
 *   - silva_testprobe      — Match a probe/primer against the SILVA database.
 *   - silva_testprime      — Evaluate a primer pair's coverage and specificity.
 *   - silva_browser        — Get the browser URL for a sequence.
 *   - silva_list_databases — List available databases and taxonomies.
 *
 * Usage:
 *   npx silva-mcp         — Run via npx
 *   node dist/index.js    — Run directly after build
 *
 * The server communicates over stdio using the MCP protocol.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { tools, handleToolCall } from "./tools.js";

/** Server name and version. */
const SERVER_NAME = "silva-mcp";
const SERVER_VERSION = "0.1.0";

/**
 * Create and configure the MCP server.
 */
function createServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register the ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools as Tool[],
    };
  });

  // Register the CallTool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result: CallToolResult = await handleToolCall(
      name,
      (args ?? {}) as Record<string, unknown>,
    );
    return result;
  });

  return server;
}

/**
 * Main entry point — start the server and connect via stdio transport.
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    // Log to stderr so it doesn't interfere with the stdio JSON-RPC protocol
    console.error(`[${SERVER_NAME} v${SERVER_VERSION}] Server started successfully.`);
    console.error(`[${SERVER_NAME}] Connected via stdio transport.`);
    console.error(`[${SERVER_NAME}] Available tools:`);
    for (const tool of tools) {
      console.error(`  - ${tool.name}: ${(tool.description || "").substring(0, 80)}...`);
    }
  } catch (error) {
    console.error(`[${SERVER_NAME}] Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
process.on("SIGINT", () => {
  console.error(`[${SERVER_NAME}] Received SIGINT, shutting down gracefully.`);
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error(`[${SERVER_NAME}] Received SIGTERM, shutting down gracefully.`);
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error(`[${SERVER_NAME}] Unhandled error:`, error);
  process.exit(1);
});

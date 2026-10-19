/**
 * MCP tool definitions for the SILVA MCP server.
 *
 * Defines all tools exposed to the LLM via the Model Context Protocol,
 * including their input schemas (JSON Schema) and handler functions.
 */

import { z } from "zod";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import * as silva from "./silvaClient.js";
import { SILVA_DATABASES, DB_TAXONOMIES, SEARCH_FIELD_IDS, SORT_FIELDS } from "./constants.js";

// ─── Tool name constants ──────────────────────────────────────────────────────
export const TOOL_NAMES = {
  SEARCH: "silva_search",
  SEQUENCE_DETAIL: "silva_sequence_detail",
  TEST_PROBE: "silva_testprobe",
  TEST_PRIME: "silva_testprime",
  BROWSE: "silva_browser",
  LIST_DATABASES: "silva_list_databases",
} as const;

// ─── Zod input schemas ────────────────────────────────────────────────────────

const searchSchema = z.object({
  database: z.enum(SILVA_DATABASES).default("ssu-144").describe(
    'SILVA database to search: "ssu-144" (SSU/16S/18S) or "lsu-138.2" (LSU/23S/28S).',
  ),
  criteria: z.array(
    z.object({
      field: z.enum(Object.keys(SEARCH_FIELD_IDS) as [string, ...string[]]).describe(
    'Search field: "organism name", "accession number", "strain", "taxonomy", etc.',
      ),
      text: z.string().min(1).describe("Search text for this field."),
    }),
  ).min(1).describe("Array of search criteria. All criteria must match (AND logic)."),
  sort: z.enum(Object.keys(SORT_FIELDS) as [string, ...string[]]).optional().describe(
    'Sort field: "accession number", "organism name", "sequence length", "sequence quality", or "alignment quality".',
  ),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort order."),
  offset: z.number().int().min(0).optional().default(0).describe("Starting offset for pagination (0-based)."),
  limit: z.number().int().min(1).max(100).optional().default(25).describe("Maximum number of results to return (1-100)."),
  onlyRef: z.boolean().optional().default(false).describe("Filter: only include Ref sequences."),
  onlyRefNR: z.boolean().optional().default(false).describe("Filter: only include RefNR sequences."),
});

const sequenceDetailSchema = z.object({
  database: z.enum(SILVA_DATABASES).default("ssu-144").describe(
    'SILVA database: "ssu-144" or "lsu-138.2".',
  ),
  silvaId: z.string().min(1).describe(
    "Internal SILVA sequence id (numeric string, obtained from search results).",
  ),
});

const testProbeSchema = z.object({
  probe: z.string().min(12).max(36).describe(
    "Probe or primer sequence (12-36 nucleotides, IUPAC codes: ACGTURYMKWSBDHVN).",
  ),
  database: z.enum(SILVA_DATABASES).default("ssu-144").describe(
    'SILVA database: "ssu-144" or "lsu-138.2".',
  ),
  databaseType: z.enum(["ref", "nr"]).default("nr").describe(
    'Database type: "ref" (Ref) or "nr" (RefNR).',
  ),
  mismatches: z.number().int().min(0).max(5).optional().default(0).describe(
    "Number of allowed mismatches (0-5).",
  ),
  nmatches: z.number().int().min(0).max(4).optional().default(0).describe(
    "Number of required 3' end matches (0-4).",
  ),
  weightedMismatches: z.boolean().optional().default(false).describe("Use weighted mismatches."),
  reverseProbe: z.boolean().optional().default(true).describe("Also search reverse complement."),
  complementProbe: z.boolean().optional().default(true).describe("Also search complement."),
  jobName: z.string().optional().describe("Optional job name for identification."),
});

const testPrimeSchema = z.object({
  forwardPrimer: z.string().min(12).describe(
    "Forward primer sequence (5'→3', ≥12 nt, IUPAC codes).",
  ),
  reversePrimer: z.string().min(12).describe(
    "Reverse primer sequence (5'→3', ≥12 nt, IUPAC codes).",
  ),
  database: z.enum(SILVA_DATABASES).default("ssu-144").describe(
    'SILVA database: "ssu-144" or "lsu-138.2".',
  ),
  databaseType: z.enum(["ref", "nr"]).default("nr").describe(
    'Database type: "ref" (Ref) or "nr" (RefNR).',
  ),
  mismatches: z.number().int().min(0).max(5).optional().default(0).describe(
    "Maximum number of allowed mismatches per primer (0-5).",
  ),
  mismatchRegion: z.number().int().min(0).max(5).optional().default(0).describe(
    "Length of 0-mismatch zone at 3' end (0-5). 0 = disabled.",
  ),
  weightedMismatches: z.boolean().optional().default(false).describe("Use weighted mismatches."),
  complementReverseProbe: z.boolean().optional().default(false).describe(
    "Complement the reverse primer before searching.",
  ),
  jobName: z.string().optional().describe("Optional job name for identification."),
});

const browseSchema = z.object({
  database: z.enum(SILVA_DATABASES).default("ssu-144").describe(
    'SILVA database: "ssu-144" or "lsu-138.2".',
  ),
  accession: z.string().min(1).describe(
    "Accession number to browse (e.g. 'X80733'), or 'cart' to view the cart.",
  ),
});

// ─── Tool definitions ────────────────────────────────────────────────────────

export const tools: Tool[] = [
  {
    name: TOOL_NAMES.SEARCH,
    description:
      "Search the SILVA rRNA database for sequences by organism name, accession number, " +
      "strain, taxonomy, sequence length, and other fields. Returns a list of matching " +
      "sequences with accession numbers, organism names, sequence lengths, quality scores, " +
      "and taxonomy paths. All criteria are combined with AND logic.",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          enum: [...SILVA_DATABASES],
          default: "ssu-144",
          description: 'SILVA database: "ssu-144" (SSU/16S/18S) or "lsu-138.2" (LSU/23S/28S).',
        },
        criteria: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                enum: Object.keys(SEARCH_FIELD_IDS),
                description:
                  'Search field: "organism name", "accession number", "strain", "taxonomy", ' +
                  '"publication", "sequence length", "sequence quality", "alignment quality", etc.',
              },
              text: { type: "string", description: "Search text for this field." },
            },
            required: ["field", "text"],
          },
          description: "Array of search criteria (all must match, AND logic).",
        },
        sort: {
          type: "string",
          enum: Object.keys(SORT_FIELDS),
          description: "Sort field.",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          default: "asc",
          description: "Sort order.",
        },
        offset: {
          type: "number",
          minimum: 0,
          default: 0,
          description: "Starting offset (0-based).",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 25,
          description: "Maximum results (1-100).",
        },
        onlyRef: {
          type: "boolean",
          default: false,
          description: "Filter: only Ref sequences.",
        },
        onlyRefNR: {
          type: "boolean",
          default: false,
          description: "Filter: only RefNR sequences.",
        },
      },
      required: ["criteria"],
    },
  },
  {
    name: TOOL_NAMES.SEQUENCE_DETAIL,
    description:
      "Get detailed information about a specific SILVA sequence, including taxonomy " +
      "under multiple classification systems (SILVA, LPSN, GTDB, etc.), environment metadata, " +
      "sequence quality features, and publication references. Requires the internal SILVA " +
      "sequence ID (obtained from search results).",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          enum: [...SILVA_DATABASES],
          default: "ssu-144",
          description: 'SILVA database: "ssu-144" or "lsu-138.2".',
        },
        silvaId: {
          type: "string",
          description: "Internal SILVA sequence id (from search results).",
        },
      },
      required: ["database", "silvaId"],
    },
  },
  {
    name: TOOL_NAMES.TEST_PROBE,
    description:
      "Submit a TestProbe job to find all occurrences of a probe or primer sequence in the " +
      "SILVA database. TestProbe 3.0 detects and evaluates probe/primer coverage across " +
      "the SILVA datasets. The job runs asynchronously on the SILVA server; use the returned " +
      "web URL to view results.",
    inputSchema: {
      type: "object",
      properties: {
        probe: {
          type: "string",
          minLength: 12,
          maxLength: 36,
          description: "Probe/primer sequence (12-36 nt, IUPAC codes: ACGTURYMKWSBDHVN).",
        },
        database: {
          type: "string",
          enum: [...SILVA_DATABASES],
          default: "ssu-144",
          description: 'SILVA database: "ssu-144" or "lsu-138.2".',
        },
        databaseType: {
          type: "string",
          enum: ["ref", "nr"],
          default: "nr",
          description: 'Database type: "ref" (Ref) or "nr" (RefNR).',
        },
        mismatches: {
          type: "number",
          minimum: 0,
          maximum: 5,
          default: 0,
          description: "Number of allowed mismatches (0-5).",
        },
        nmatches: {
          type: "number",
          minimum: 0,
          maximum: 4,
          default: 0,
          description: "Number of required 3' end matches (0-4).",
        },
        weightedMismatches: {
          type: "boolean",
          default: false,
          description: "Use weighted mismatches.",
        },
        reverseProbe: {
          type: "boolean",
          default: true,
          description: "Also search reverse complement.",
        },
        complementProbe: {
          type: "boolean",
          default: true,
          description: "Also search complement.",
        },
        jobName: {
          type: "string",
          description: "Optional job name.",
        },
      },
      required: ["probe"],
    },
  },
  {
    name: TOOL_NAMES.TEST_PRIME,
    description:
      "Submit a TestPrime job to evaluate the coverage and specificity of a primer pair " +
      "against the SILVA database. TestPrime 1.0 matches forward and reverse primers and " +
      "calculates coverage per taxonomic group. The job runs asynchronously; use the " +
      "returned web URL to view results.",
    inputSchema: {
      type: "object",
      properties: {
        forwardPrimer: {
          type: "string",
          minLength: 12,
          description: "Forward primer sequence (5'→3', IUPAC codes).",
        },
        reversePrimer: {
          type: "string",
          minLength: 12,
          description: "Reverse primer sequence (5'→3', IUPAC codes).",
        },
        database: {
          type: "string",
          enum: [...SILVA_DATABASES],
          default: "ssu-144",
          description: 'SILVA database: "ssu-144" or "lsu-138.2".',
        },
        databaseType: {
          type: "string",
          enum: ["ref", "nr"],
          default: "nr",
          description: 'Database type: "ref" (Ref) or "nr" (RefNR).',
        },
        mismatches: {
          type: "number",
          minimum: 0,
          maximum: 5,
          default: 0,
          description: "Maximum allowed mismatches per primer (0-5).",
        },
        mismatchRegion: {
          type: "number",
          minimum: 0,
          maximum: 5,
          default: 0,
          description: "Length of 0-mismatch zone at 3' end (0-5). 0 = disabled.",
        },
        weightedMismatches: {
          type: "boolean",
          default: false,
          description: "Use weighted mismatches.",
        },
        complementReverseProbe: {
          type: "boolean",
          default: false,
          description: "Complement the reverse primer before searching.",
        },
        jobName: {
          type: "string",
          description: "Optional job name.",
        },
      },
      required: ["forwardPrimer", "reversePrimer"],
    },
  },
  {
    name: TOOL_NAMES.BROWSE,
    description:
      "Get the URL to view a specific sequence or the cart in the SILVA taxonomy browser. " +
      "The browser provides interactive exploration of the taxonomic context of sequences.",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          enum: [...SILVA_DATABASES],
          default: "ssu-144",
          description: 'SILVA database: "ssu-144" or "lsu-138.2".',
        },
        accession: {
          type: "string",
          description: "Accession number (e.g. 'X80733') or 'cart' to view the cart.",
        },
      },
      required: ["accession"],
    },
  },
  {
    name: TOOL_NAMES.LIST_DATABASES,
    description:
      "List all available SILVA databases and their supported taxonomy classification " +
      "systems. Returns database IDs, full names, and available taxonomies.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ─── Tool handler ────────────────────────────────────────────────────────────

/**
 * Handle a tool call and return the result.
 * @param name - The tool name.
 * @param args - The tool arguments (raw JSON).
 * @returns MCP CallToolResult.
 */
export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    switch (name) {
      case TOOL_NAMES.SEARCH: {
        const params = searchSchema.parse(args);
        const result = await silva.searchSequences(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.SEQUENCE_DETAIL: {
        const params = sequenceDetailSchema.parse(args);
        const result = await silva.getSequenceDetail(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.TEST_PROBE: {
        const params = testProbeSchema.parse(args);
        const result = await silva.testProbe(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.TEST_PRIME: {
        const params = testPrimeSchema.parse(args);
        const result = await silva.testPrime(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.BROWSE: {
        const params = browseSchema.parse(args);
        const result = await silva.browseSequence(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.LIST_DATABASES: {
        const databases = SILVA_DATABASES.map((db) => ({
          id: db,
          name: db === "ssu-144" ? "SSU r144 (Small Subunit / 16S / 18S)" : "LSU r138.2 (Large Subunit / 23S / 28S)",
          taxonomies: DB_TAXONOMIES[db] || [],
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ databases }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown tool "${name}". Available tools: ${Object.values(TOOL_NAMES).join(", ")}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

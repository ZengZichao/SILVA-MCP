/**
 * Type definitions for SILVA MCP server.
 */

import type { SilvaDatabase, SilvaDatabaseType, TaxonomyName, SortField, SearchFieldName } from "./constants.js";

/** A single search criterion (field + text). */
export interface SearchCriterion {
  /** The field to search in (organism name, accession number, etc.). */
  field: SearchFieldName | string;
  /** The search text. */
  text: string;
}

/** Parameters for the `silva_search` tool. */
export interface SearchParams {
  /** Database to search: "ssu-144" or "lsu-138.2". */
  database: SilvaDatabase;
  /** Array of search criteria (all must match). */
  criteria: SearchCriterion[];
  /** Sort field. */
  sort?: SortField | string;
  /** Sort order: "asc" or "desc". */
  sortOrder?: "asc" | "desc";
  /** Starting offset for pagination (0-based). */
  offset?: number;
  /** Maximum number of results to return (1–100). */
  limit?: number;
  /** Filter: only Ref sequences. */
  onlyRef?: boolean;
  /** Filter: only RefNR sequences. */
  onlyRefNR?: boolean;
}

/** A parsed sequence record from search results. */
export interface SequenceRecord {
  /** Internal SILVA sequence id. */
  silvaId: string;
  /** Accession number (e.g. "X80733"). */
  accession: string;
  /** Organism name. */
  organismName: string;
  /** Sequence length in bases. */
  sequenceLength: number;
  /** Sequence quality percentage (0–100), or null if unavailable. */
  sequenceQuality: number | null;
  /** Alignment quality percentage (0–100), or null if unavailable. */
  alignmentQuality: number | null;
  /** Taxonomy path (SILVA taxonomy by default). */
  taxonomy: string;
}

/** Search result returned by the `silva_search` tool. */
export interface SearchResult {
  database: SilvaDatabase;
  totalRegions: number;
  totalAccessions: number;
  totalPages: number;
  currentPage: number;
  returned: number;
  sequences: SequenceRecord[];
}

/** Parameters for the `silva_sequence_detail` tool. */
export interface SequenceDetailParams {
  /** Database: "ssu-144" or "lsu-138.2". */
  database: SilvaDatabase;
  /** Internal SILVA sequence id (numeric string). */
  silvaId: string;
}

/** Detailed sequence information. */
export interface SequenceDetail {
  silvaId: string;
  accession: string;
  organismName: string;
  obsoleteNames: string;
  strain: string;
  isolate: string;
  clone: string;
  length: number;
  dateCreated: string;
  dateModified: string;
  version: string;
  autoClassified: string;
  /** Map of taxonomy name → taxonomy path. */
  taxonomies: Record<string, string>;
  /** Environment metadata. */
  environment: Record<string, string>;
  /** Feature metadata (product, quality, etc.). */
  features: Record<string, string>;
  /** Publication references. */
  references: Array<Record<string, string>>;
}

/** Parameters for the `silva_testprobe` tool. */
export interface TestProbeParams {
  /** Probe or primer sequence (12–36 nt, IUPAC nucleotide codes). */
  probe: string;
  /** Database: "ssu-144" or "lsu-138.2". */
  database: SilvaDatabase;
  /** Database type: "ref" or "nr". */
  databaseType: SilvaDatabaseType;
  /** Number of allowed mismatches (0–5). */
  mismatches?: number;
  /** Number of allowed 3′-end matches (0–4). */
  nmatches?: number;
  /** Whether to use weighted mismatches. */
  weightedMismatches?: boolean;
  /** Whether to also search the reverse complement. */
  reverseProbe?: boolean;
  /** Whether to also search the complement. */
  complementProbe?: boolean;
  /** Optional job name. */
  jobName?: string;
}

/** TestProbe result. */
export interface TestProbeResult {
  jobId: number | null;
  status: string;
  message: string;
  /** Number of matched accessions, if available. */
  matchedAccessions: number | null;
  /** Number of matched regions, if available. */
  matchedRegions: number | null;
  /** Web URL to view results in the browser. */
  webUrl: string;
}

/** Parameters for the `silva_testprime` tool. */
export interface TestPrimeParams {
  /** Forward primer sequence (5′→3′, ≥12 nt, IUPAC). */
  forwardPrimer: string;
  /** Reverse primer sequence (5′→3′, ≥12 nt, IUPAC). */
  reversePrimer: string;
  /** Database: "ssu-144" or "lsu-138.2". */
  database: SilvaDatabase;
  /** Database type: "ref" or "nr". */
  databaseType: SilvaDatabaseType;
  /** Maximum number of allowed mismatches (0–5). */
  mismatches?: number;
  /** Length of 0-mismatch zone at 3′ end (0–5). */
  mismatchRegion?: number;
  /** Whether to use weighted mismatches. */
  weightedMismatches?: boolean;
  /** Whether to complement the reverse primer. */
  complementReverseProbe?: boolean;
  /** Taxonomies to calculate pie charts for. */
  taxonomies?: TaxonomyName[];
  /** Optional job name. */
  jobName?: string;
}

/** TestPrime result. */
export interface TestPrimeResult {
  jobId: number | null;
  status: string;
  message: string;
  /** Web URL to view results in the browser. */
  webUrl: string;
}

/** Parameters for the `silva_browser` tool. */
export interface BrowserParams {
  /** Database: "ssu-144" or "lsu-138.2". */
  database: SilvaDatabase;
  /** Accession number or "cart". */
  accession: string;
}

/** Browser result (URL + parsed info). */
export interface BrowserResult {
  url: string;
  accession: string;
  database: SilvaDatabase;
  message: string;
}

/** Generic JSON response from the SILVA WS endpoint. */
export type SilvaWSResponse = Record<string, unknown>;

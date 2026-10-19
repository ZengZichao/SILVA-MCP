/**
 * SILVA database constants and configuration.
 *
 * SILVA (https://www.arb-silva.de/) provides comprehensive, quality checked
 * databases of aligned ribosomal RNA (rRNA) sequences for all three domains
 * of life (Bacteria, Archaea and Eukarya).
 *
 * The web service at `https://legatum.arb-silva.de/WS/` is the underlying
 * JSON API that powers the SILVA Search, Browser, TestProbe and TestPrime tools.
 */

/** Base URL of the SILVA web-service (the "legatum" backend). */
export const SILVA_WS_BASE = "https://legatum.arb-silva.de";

/** Endpoint for JSON web-service calls. */
export const SILVA_WS_ENDPOINT = `${SILVA_WS_BASE}/WS/`;

/** Base URL of the public SILVA website. */
export const SILVA_WEB_BASE = "https://www.arb-silva.de";

/** Default timeout for HTTP requests (30 seconds). */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Default page size for search results. */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum number of search result items to return in a single tool call. */
export const MAX_RESULTS = 100;

/** Available SILVA databases. */
export const SILVA_DATABASES = ["ssu-144", "lsu-138.2"] as const;
export type SilvaDatabase = (typeof SILVA_DATABASES)[number];

/** Database type: "ref" (Ref) or "nr" (RefNR). */
export type SilvaDatabaseType = "ref" | "nr";

/** Search field identifiers used by the SILVA search form. */
export const SEARCH_FIELD_IDS = {
  "organism name": 0,
  "accession number": 1,
  strain: 2,
  "publication ID": 3,
  publication: 4,
  "sequence length": 5,
  "sequence quality": 6,
  "alignment quality": 7,
  "alignment identity": 8,
  taxonomy: 9,
  "sequence entry": 10,
  "date submitted": 11,
  "genome project ID": 12,
  "straininfo.net ID": 13,
  "NCBI tax ID": 14,
} as const;

export type SearchFieldName = keyof typeof SEARCH_FIELD_IDS;

/** Sort field IDs used by the SILVA search. */
export const SORT_FIELDS = {
  "accession number": 1,
  "organism name": 2,
  "sequence length": 3,
  "sequence quality": 4,
  "alignment quality": 5,
} as const;

export type SortField = keyof typeof SORT_FIELDS;

/** Taxonomy names available in the SILVA databases. */
export const TAXONOMY_NAMES = [
  "silva",
  "silva-ref",
  "silva-ref-nr",
  "lpsn",
  "ltp",
  "embl-ebi/ena",
  "gtdb",
  "rdp",
] as const;

export type TaxonomyName = (typeof TAXONOMY_NAMES)[number];

/** Mapping of database id → available taxonomy names. */
export const DB_TAXONOMIES: Record<SilvaDatabase, TaxonomyName[]> = {
  "ssu-144": ["silva", "silva-ref", "silva-ref-nr", "lpsn", "ltp", "embl-ebi/ena", "gtdb"],
  "lsu-138.2": ["silva", "silva-ref", "silva-ref-nr", "ltp", "embl-ebi/ena", "gtdb", "rdp"],
};

/** Human-readable labels for search fields. */
export const SEARCH_FIELD_LABELS: Record<number, string> = {
  0: "organism name",
  1: "accession number",
  2: "strain",
  3: "publication ID",
  4: "publication",
  5: "sequence length",
  6: "sequence quality",
  7: "alignment quality",
  8: "alignment identity",
  9: "taxonomy",
  10: "sequence entry",
  11: "date submitted",
  12: "genome project ID",
  13: "straininfo.net ID",
  14: "NCBI tax ID",
};

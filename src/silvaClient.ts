/**
 * SILVA Web Service API client.
 *
 * Wraps all HTTP communication with the SILVA backend at
 * `https://legatum.arb-silva.de/WS/` and parses the JSON+HTML
 * responses into clean TypeScript objects.
 */

import type {
  SearchResult,
  SequenceRecord,
  SequenceDetail,
  SearchParams,
  SequenceDetailParams,
  TestProbeParams,
  TestProbeResult,
  TestPrimeParams,
  TestPrimeResult,
  BrowserParams,
  BrowserResult,
  SilvaWSResponse,
} from "./types.js";
import {
  SILVA_WS_ENDPOINT,
  SILVA_WEB_BASE,
  SEARCH_FIELD_IDS,
  SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TIMEOUT_MS,
} from "./constants.js";
import { stripHtml, extractNumber, extractPercent, extractAll, extractBetween } from "./htmlParser.js";

/** Valid IUPAC nucleotide codes for probe/primer validation. */
const IUPAC_NUCLEOTIDES = /^[ACGTURYMKWSBDHVNacgturymkwsbdhvn]+$/;

/**
 * Validate that a sequence contains only valid IUPAC nucleotide codes.
 * @throws Error if the sequence contains invalid characters.
 */
function validateIupacSequence(seq: string, label: string): void {
  if (!IUPAC_NUCLEOTIDES.test(seq)) {
    throw new Error(
      `Invalid ${label}: "${seq}" contains invalid characters. Only IUPAC nucleotide codes (ACGTURYMKWSBDHVN) are allowed.`,
    );
  }
}

/** Build a wrapped parameter key (e.g. "tx_pmtree_pi1[type]"). */
function wp(key: string): string {
  return `tx_pmtree_pi1[${key}]`;
}

/** Build URL-encoded form body from a record of parameters. */
function buildBody(params: Record<string, string | string[]>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        body.append(key, v);
      }
    } else {
      body.append(key, value);
    }
  }
  return body;
}

/** Make a POST request to the SILVA WS endpoint and return JSON. */
async function wsRequest(
  params: Record<string, string | string[]>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SilvaWSResponse> {
  const body = buildBody(params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(SILVA_WS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json, text/javascript, */*",
        "User-Agent": "SILVA-MCP/0.1.0 (https://www.arb-silva.de/)",
      },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`SILVA WS request failed: HTTP ${resp.status} ${resp.statusText}`);
    }
    const text = await resp.text();
    // The WS endpoint returns JSON, but some responses may be wrapped in
    // JSONP-style parentheses like ({...}). Strip the outer parens if present.
    const trimmed = text.trim();
    const cleaned = trimmed.startsWith("(") && trimmed.endsWith(")")
      ? trimmed.slice(1, -1)
      : trimmed;
    // The WS endpoint always returns JSON
    try {
      return JSON.parse(cleaned) as SilvaWSResponse;
    } catch {
      throw new Error(`SILVA WS returned non-JSON response: ${text.substring(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Make a GET request to an arbitrary SILVA URL and return text (HTML). */
async function getTextRequest(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "text/html, */*",
        "User-Agent": "SILVA-MCP/0.1.0 (https://www.arb-silva.de/)",
      },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`SILVA request failed: HTTP ${resp.status} ${resp.statusText}`);
    }
    return resp.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse the HTML search result table into structured sequence records.
 * @param searchResultHtml - The `searchResult` field from the WS JSON response.
 * @returns Array of parsed SequenceRecord objects.
 */
function parseSearchResults(searchResultHtml: string): SequenceRecord[] {
  const records: SequenceRecord[] = [];
  if (!searchResultHtml) return records;

  // Each result row: <tr class="resultItem" sid="...">
  const rowRegex = /<tr\s+class="resultItem"\s+sid="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(searchResultHtml)) !== null) {
    const sid = m[1];
    const rowHtml = m[2];

    // Extract accession number from <td class="accessionNumber">X</td>
    const accession = extractBetween(rowHtml, 'class="accessionNumber">', "</td>") || "";
    // Extract organism name from <td class="organismName"><em>...</em></td>
    const organismRaw = extractBetween(rowHtml, 'class="organismName">', "</td>") || "";
    const organismName = stripHtml(organismRaw);
    // Extract sequence length from <td class="sequenceLength">...</td>
    const lengthRaw = extractBetween(rowHtml, 'class="sequenceLength">', "</td>") || "";
    const sequenceLength = extractNumber(stripHtml(lengthRaw)) || 0;
    // Extract quality values from img alt attributes
    const qualityCells = extractAll(rowHtml, /class="quality">[\s\S]*?<img[^>]*alt="([\d.]+%)"[^>]*>/g);
    const seqQuality = qualityCells[0] ? extractPercent(qualityCells[0]) : null;
    const alignQuality = qualityCells[1] ? extractPercent(qualityCells[1]) : null;
    // Extract taxonomy from the popup popuptext
    const taxonomyRaw =
      extractBetween(rowHtml, 'popuptext="', '"') ||
      extractBetween(rowHtml, 'class="taxonomyPath">', "</td>") ||
      "";
    // Parse taxonomy: the SILVA HTML uses <img alt=";"/> as separator.
    // stripHtml replaces <img alt=";"/> with ";", so we then replace ";" with " > ".
    const taxonomy = stripHtml(taxonomyRaw)
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join(" > ");

    records.push({
      silvaId: sid,
      accession: accession.trim(),
      organismName,
      sequenceLength,
      sequenceQuality: seqQuality,
      alignmentQuality: alignQuality,
      taxonomy,
    });
  }

  return records;
}

/**
 * Parse the search stats HTML to extract totals.
 * @param statsHtml - The `searchStats` field from the WS JSON response.
 * @returns Object with totalRegions, totalAccessions, totalPages.
 */
function parseSearchStats(statsHtml: string): {
  totalRegions: number;
  totalAccessions: number;
  totalPages: number;
} {
  const result = { totalRegions: 0, totalAccessions: 0, totalPages: 0 };
  if (!statsHtml) return result;

  // "rRNA regions: 1 - 25 / 388740"
  const regionsMatch = statsHtml.match(/rRNA regions:\s*([\d\s,-]+)\s*\/\s*(\d+)/);
  if (regionsMatch) {
    result.totalRegions = parseInt(regionsMatch[2], 10);
  }

  // "Accessions: 323687"
  const accMatch = statsHtml.match(/Accessions:\s*(\d+)/);
  if (accMatch) {
    result.totalAccessions = parseInt(accMatch[1], 10);
  }

  // "Page: 1/15550"
  const pageMatch = statsHtml.match(/Page:\s*(\d+)\s*\/\s*(\d+)/);
  if (pageMatch) {
    result.totalPages = parseInt(pageMatch[2], 10);
  }

  return result;
}

/**
 * Search the SILVA database for sequences.
 * @param params - Search parameters.
 * @returns Parsed search result.
 */
export async function searchSequences(params: SearchParams): Promise<SearchResult> {
  const {
    database,
    criteria,
    sort,
    sortOrder,
    offset = 0,
    limit = DEFAULT_PAGE_SIZE,
    onlyRef = false,
    onlyRefNR = false,
  } = params;

  if (criteria.length === 0) {
    throw new Error("At least one search criterion is required.");
  }

  const cappedLimit = Math.min(Math.max(1, limit), 100);

  // Build the qfield[] and qtext[] arrays
  const qfields: string[] = [];
  const qtexts: string[] = [];
  for (const c of criteria) {
    const fieldId = (SEARCH_FIELD_IDS as Record<string, number>)[c.field];
    if (fieldId === undefined) {
      throw new Error(`Unknown search field: ${c.field}. Available: ${Object.keys(SEARCH_FIELD_IDS).join(", ")}`);
    }
    qfields.push(String(fieldId));
    qtexts.push(c.text);
  }

  // Build base params for stats call
  const baseParams: Record<string, string | string[]> = {
    [wp("type")]: "search",
    [wp("action")]: "stats",
    [wp("db")]: database,
    [wp("submit")]: "",
    [`${wp("qfield")}[]`]: qfields,
    [`${wp("qtext")}[]`]: qtexts,
  };

  if (onlyRef) baseParams["onlyRef"] = "1";
  if (onlyRefNR) baseParams["onlyRefNR"] = "1";

  // First, get stats
  const statsResp = await wsRequest(baseParams);
  const statsHtml = (statsResp.searchStats as string) || "";
  const stats = parseSearchStats(statsHtml);

  // Then, get results with offset/limit
  const resultParams: Record<string, string | string[]> = {
    ...baseParams,
    [wp("action")]: "result",
    [wp("from")]: String(offset),
  };

  if (sort) {
    const sortId = (SORT_FIELDS as Record<string, number>)[sort];
    if (sortId !== undefined) {
      resultParams[wp("sort")] = String(sortId);
      // sortOrder: "asc" is the SILVA default; "desc" reverses by prefixing the sort field
      if (sortOrder === "desc") {
        resultParams[wp("sortorder")] = "desc";
      }
    }
  }

  const resultResp = await wsRequest(resultParams);
  const searchResultHtml = (resultResp.searchResult as string) || "";
  const sequences = parseSearchResults(searchResultHtml);

  // If there are no results, check for the no-result message
  if (sequences.length === 0 && searchResultHtml.includes("No sequences matched")) {
    return {
      database,
      totalRegions: 0,
      totalAccessions: 0,
      totalPages: 0,
      currentPage: 1,
      returned: 0,
      sequences: [],
    };
  }

  return {
    database,
    totalRegions: stats.totalRegions,
    totalAccessions: stats.totalAccessions,
    totalPages: stats.totalPages,
    currentPage: Math.floor(offset / cappedLimit) + 1,
    returned: sequences.length,
    sequences,
  };
}

/**
 * Get detailed information about a single sequence.
 * @param params - Detail parameters (database + silvaId).
 * @returns Parsed sequence detail.
 */
export async function getSequenceDetail(params: SequenceDetailParams): Promise<SequenceDetail> {
  const { database, silvaId } = params;

  // The fulldetail endpoint returns raw HTML (not JSON), so we use a GET request
  // with URL-encoded query parameters.
  const queryParams = new URLSearchParams({
    [wp("type")]: "fulldetail",
    [wp("db")]: database,
    [wp("treeid")]: silvaId,
  });
  const html = await getTextRequest(`${SILVA_WS_ENDPOINT}?${queryParams.toString()}`);

  return parseSequenceDetail(html, silvaId);
}

/**
 * Parse the fulldetail HTML response into a SequenceDetail object.
 */
function parseSequenceDetail(html: string, silvaId: string): SequenceDetail {
  const detail: SequenceDetail = {
    silvaId,
    accession: "",
    organismName: "",
    obsoleteNames: "--",
    strain: "--",
    isolate: "--",
    clone: "--",
    length: 0,
    dateCreated: "--",
    dateModified: "--",
    version: "--",
    autoClassified: "--",
    taxonomies: {},
    environment: {},
    features: {},
    references: [],
  };

  if (!html) return detail;

  // Helper: extract the value from a <td class="label">LABEL</td><td class="value">VALUE</td> row
  const extractRow = (label: string): string | null => {
    const re = new RegExp(
      `<td\\s+class="label">${label}</td>\\s*<td\\s+class="value">([\\s\\S]*?)</td>`,
      "i",
    );
    const m = html.match(re);
    return m ? stripHtml(m[1]).trim() : null;
  };

  // General information
  detail.accession = extractRow("Accession number") || "";
  // Strip the ENA link from accession
  const accMatch = detail.accession.match(/^(\S+)/);
  if (accMatch) detail.accession = accMatch[1];

  detail.organismName = extractRow("Organism name") || "--";
  detail.obsoleteNames = extractRow("Obsolete names") || "--";
  detail.strain = extractRow("Strain") || "--";
  detail.isolate = extractRow("Isolate") || "--";
  detail.clone = extractRow("Clone") || "--";
  detail.length = extractNumber(extractRow("Length") || "0") || 0;
  detail.dateCreated = extractRow("Date created") || "--";
  detail.dateModified = extractRow("Date modified") || "--";
  detail.version = extractRow("Version") || "--";
  detail.autoClassified = extractRow("Auto Classified") || "--";

  // Taxonomy section: <tr><td class="label">SILVA</td><td class="value">...</td></tr>
  const taxSectionMatch = html.match(/<h4>Taxonomy<\/h4>([\s\S]*?)<\/table>/);
  if (taxSectionMatch) {
    const taxHtml = taxSectionMatch[1];
    const taxRowRegex = /<td\s+class="label">(.*?)<\/td>\s*<td\s+class="value">([\s\S]*?)<\/td>/g;
    let tm: RegExpExecArray | null;
    while ((tm = taxRowRegex.exec(taxHtml)) !== null) {
      const taxName = stripHtml(tm[1]).trim();
      const taxValue = stripHtml(tm[2])
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .join(" > ");
      if (taxName) detail.taxonomies[taxName] = taxValue;
    }
  }

  // Environment section
  const envSectionMatch = html.match(/<h4>Environment<\/h4>([\s\S]*?)<\/table>/);
  if (envSectionMatch) {
    const envHtml = envSectionMatch[1];
    const envRowRegex = /<td\s+class="label">(.*?)<\/td>\s*<td\s+class="value">([\s\S]*?)<\/td>/g;
    let em: RegExpExecArray | null;
    while ((em = envRowRegex.exec(envHtml)) !== null) {
      const envName = stripHtml(em[1]).trim();
      const envValue = stripHtml(em[2]).trim();
      if (envName) detail.environment[envName] = envValue;
    }
  }

  // Features section
  const featSectionMatch = html.match(/<h4>Features<\/h4>([\s\S]*?)<\/table>/);
  if (featSectionMatch) {
    const featHtml = featSectionMatch[1];
    // Features table has a different layout (some rows have 2 label/value pairs)
    const featRowRegex = /<td\s+class="label">(.*?)<\/td>\s*<td\s+class="value">([\s\S]*?)<\/td>(?:\s*<td\s+class="label">(.*?)<\/td>\s*<td\s+class="value">([\s\S]*?)<\/td>)?/g;
    let fm: RegExpExecArray | null;
    while ((fm = featRowRegex.exec(featHtml)) !== null) {
      const label1 = stripHtml(fm[1]).trim();
      const value1 = stripHtml(fm[2]).trim();
      if (label1) detail.features[label1] = value1;
      const label2 = stripHtml(fm[3]).trim();
      const value2 = stripHtml(fm[4]).trim();
      if (label2) detail.features[label2] = value2;
    }
  }

  // References section
  const refSectionMatch = html.match(/<h4>References<\/h4>([\s\S]*?)(?=<h4>|<\/div>\s*$|$)/);
  if (refSectionMatch) {
    const refHtml = refSectionMatch[1];
    // Each reference is a separate <table>
    const refTableRegex = /<table[^>]*summary="Description"[^>]*>([\s\S]*?)<\/table>/g;
    let rm: RegExpExecArray | null;
    while ((rm = refTableRegex.exec(refHtml)) !== null) {
      const refContent = rm[1];
      const ref: Record<string, string> = {};
      const refRowRegex = /<td\s+class="label">(.*?)<\/td>\s*<td\s+class="value"[\s\S]*?>([\s\S]*?)<\/td>/g;
      let rrm: RegExpExecArray | null;
      while ((rrm = refRowRegex.exec(refContent)) !== null) {
        const label = stripHtml(rrm[1]).trim();
        const value = stripHtml(rrm[2]).trim();
        if (label) ref[label] = value;
      }
      if (Object.keys(ref).length > 0) detail.references.push(ref);
    }
  }

  return detail;
}

/**
 * Submit a TestProbe job to find all occurrences of a probe/primer sequence.
 * @param params - TestProbe parameters.
 * @returns TestProbe job info.
 */
export async function testProbe(params: TestProbeParams): Promise<TestProbeResult> {
  const {
    probe,
    database,
    databaseType = "nr",
    mismatches = 0,
    nmatches = 0,
    weightedMismatches = false,
    reverseProbe = true,
    complementProbe = true,
    jobName = "",
  } = params;

  // Validate probe sequence contains only IUPAC nucleotide codes
  validateIupacSequence(probe, "probe sequence");

  // Submit the job
  const resp = await wsRequest({
    [wp("type")]: "testprobe",
    [wp("action")]: "submit",
    [wp("db")]: database,
    [wp("databasetype")]: databaseType,
    [wp("probe")]: probe,
    [wp("mismatches")]: String(mismatches),
    [wp("nmatches")]: String(nmatches),
    [wp("weightedmismatches")]: weightedMismatches ? "1" : "0",
    [wp("reverseprobe")]: reverseProbe ? "1" : "0",
    [wp("complementprobe")]: complementProbe ? "1" : "0",
    [wp("jobname")]: jobName,
  });

  const jobId = (resp.jobId as number) || (resp.job_id as number) || null;
  const status = (resp.status as string) || "submitted";
  const message = (resp.message as string) || (resp.status_msg as string) || "Job submitted successfully.";

  // Check for error response from SILVA
  if (resp.success === false) {
    return {
      jobId: null,
      status: "error",
      message: (resp.error as string) || (resp.message as string) || "SILVA rejected the TestProbe request.",
      matchedAccessions: null,
      matchedRegions: null,
      webUrl: "",
    };
  }

  // Construct web URL for viewing results
  const dbShort = database.split("-")[0];
  const safeJobName = encodeURIComponent(jobName || "probe");
  const webUrl = `${SILVA_WEB_BASE}/search/testprobe/probe/${dbShort}/${encodeURIComponent(probe)}/${safeJobName}`;

  return {
    jobId,
    status,
    message,
    matchedAccessions: (resp.accessions as number) ?? null,
    matchedRegions: (resp.regions as number) ?? null,
    webUrl,
  };
}

/**
 * Submit a TestPrime job to evaluate primer pair coverage.
 * @param params - TestPrime parameters.
 * @returns TestPrime job info.
 */
export async function testPrime(params: TestPrimeParams): Promise<TestPrimeResult> {
  const {
    forwardPrimer,
    reversePrimer,
    database,
    databaseType = "nr",
    mismatches = 0,
    mismatchRegion = 0,
    weightedMismatches = false,
    complementReverseProbe = false,
    jobName = "",
  } = params;

  // Validate primer sequences contain only IUPAC nucleotide codes
  validateIupacSequence(forwardPrimer, "forward primer sequence");
  validateIupacSequence(reversePrimer, "reverse primer sequence");

  // Submit the job via the WS endpoint
  const resp = await wsRequest({
    [wp("type")]: "testprime",
    [wp("action")]: "submit",
    [wp("db")]: database,
    [wp("databasetype")]: databaseType,
    [wp("probeForward")]: forwardPrimer,
    [wp("probeReverse")]: reversePrimer,
    [wp("matchMismatches")]: String(mismatches),
    [wp("mismatchRegion")]: String(mismatchRegion),
    [wp("weightedmismatches")]: weightedMismatches ? "1" : "0",
    [wp("complementReverseProbe")]: complementReverseProbe ? "1" : "0",
    [wp("jobname")]: jobName,
  });

  const jobId = (resp.jobId as number) || (resp.job_id as number) || null;
  const status = (resp.status as string) || "submitted";
  const message = (resp.message as string) || (resp.status_msg as string) || "Job submitted successfully.";

  // Check for error response from SILVA
  if (resp.success === false) {
    return {
      jobId: null,
      status: "error",
      message: (resp.error as string) || (resp.message as string) || "SILVA rejected the TestPrime request.",
      webUrl: "",
    };
  }

  const webUrl = `${SILVA_WEB_BASE}/testprime/`;

  return {
    jobId,
    status,
    message,
    webUrl,
  };
}

/**
 * Get the URL for browsing a sequence in the SILVA taxonomy browser.
 * @param params - Browser parameters.
 * @returns Browser result with URL.
 */
export async function browseSequence(params: BrowserParams): Promise<BrowserResult> {
  const { database, accession } = params;
  const dbPart = database.split("-")[0]; // "ssu" or "lsu"
  const url = `${SILVA_WEB_BASE}/browser/${dbPart}/${encodeURIComponent(accession)}`;

  return {
    url,
    accession,
    database,
    message: `View ${accession} in the SILVA ${database.toUpperCase()} taxonomy browser at ${url}`,
  };
}

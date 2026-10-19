/**
 * HTML parsing utilities for extracting structured data from SILVA web-service responses.
 *
 * The SILVA web-service returns JSON with embedded HTML fragments. These functions
 * parse those HTML fragments to extract clean structured data.
 */

/**
 * Strip all HTML tags from a string, replacing tags with appropriate separators.
 * @param html - The HTML string to strip.
 * @returns Plain text with tags removed.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    // Replace <br> and <br/> with newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace <img ... alt="X" ...> with the alt text (double or single quotes)
    .replace(/<img[^>]*\salt=["']([^"']*)["'][^>]*\/?>/gi, "$1")
    // Replace <img ... title="X" ...> with the title text (double or single quotes)
    .replace(/<img[^>]*\stitle=["']([^"']*)["'][^>]*\/?>/gi, "$1")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&copy;/g, "(c)")
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .trim();
}

/**
 * Extract the first numeric value found in a string.
 * @param s - The string to search.
 * @returns The number, or null if no number is found.
 */
export function extractNumber(s: string): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Extract a percentage value (e.g. "87.33%") from a string.
 * @param s - The string to search.
 * @returns The percentage as a number (e.g. 87.33), or null.
 */
export function extractPercent(s: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Extract the value of an HTML attribute from a tag.
 * @param html - The HTML fragment.
 * @param attr - The attribute name (e.g. "sid").
 * @returns The attribute value or null.
 */
export function extractAttr(html: string, attr: string): string | null {
  const re = new RegExp(`${attr}=["']([^"']*)["']`);
  const m = html.match(re);
  return m ? m[1] : null;
}

/**
 * Extract text between two strings (exclusive).
 * @param s - The source string.
 * @param start - The start delimiter.
 * @param end - The end delimiter.
 * @returns The text between start and end, or null.
 */
export function extractBetween(s: string, start: string, end: string): string | null {
  const si = s.indexOf(start);
  if (si === -1) return null;
  const ei = s.indexOf(end, si + start.length);
  if (ei === -1) return null;
  return s.substring(si + start.length, ei);
}

/**
 * Extract all matches of a regex with a capture group.
 * @param s - The source string.
 * @param re - The regex pattern (should have at least one capture group).
 * @returns Array of captured strings.
 */
export function extractAll(s: string, re: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const regex = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = regex.exec(s)) !== null) {
    if (m[1]) results.push(m[1]);
  }
  return results;
}

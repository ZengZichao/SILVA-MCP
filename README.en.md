# SILVA-MCP

> **A Model Context Protocol (MCP) Server for the [SILVA rRNA Database](https://www.arb-silva.de/)**
>
> Version: 0.1.0
>
> [中文文档](./README.zh.md) | **English**

---

> **Disclaimer:** This is an **unofficial** community-driven project and is not affiliated with, endorsed by, or officially connected to SILVA, DSMZ, or the SILVA rRNA database team. SILVA is a registered trademark of its respective owners. For the official SILVA website, please visit [https://www.arb-silva.de/](https://www.arb-silva.de/).

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Available Tools](#available-tools)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Tool Reference](#tool-reference)
- [Architecture](#architecture)
- [Development](#development)
- [SILVA Database Background](#silva-database-background)
- [License](#license)
- [Citation](#citation)

---

## Overview

**SILVA-MCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the SILVA rRNA database's web-service APIs as tools callable by Large Language Models (LLMs). It enables AI assistants to search sequences, retrieve detailed metadata, match probes and primers, and browse the SILVA taxonomy — all through the standardized MCP interface.

SILVA is a comprehensive online resource for quality checked and regularly updated ribosomal RNA (rRNA) sequence databases, maintained by the [DSMZ](https://www.dsmz.de/) (Leibniz Institute DSMZ — German Collection of Microorganisms and Cell Cultures GmbH). SILVA provides aligned small (16S/18S, SSU) and large subunit (23S/28S, LSU) rRNA sequences for all three domains of life (Bacteria, Archaea, and Eukarya).

## Features

- **Sequence Search** — Search the SILVA database by organism name, accession number, strain, taxonomy, sequence length, quality, and more, with multi-field AND logic.
- **Sequence Detail Retrieval** — Get comprehensive metadata for a specific sequence, including multi-taxonomy classifications (SILVA, LPSN, GTDB, ENA), environmental metadata, quality metrics, and publication references.
- **TestProbe (Probe/Primer Matching)** — Submit a probe or primer sequence to find all matching sequences in the SILVA database with configurable mismatch tolerance.
- **TestPrime (Primer Pair Evaluation)** — Evaluate the coverage and specificity of a forward/reverse primer pair against the entire SILVA database.
- **Taxonomy Browser URL Generation** — Generate direct URLs to the SILVA taxonomy browser for interactive exploration.
- **Database Listing** — Enumerate available databases and their supported taxonomy classification systems.

## Available Tools

| Tool | Description |
|---|---|
| `silva_search` | Search for rRNA sequences matching one or more criteria |
| `silva_sequence_detail` | Get detailed information about a single sequence |
| `silva_testprobe` | Match a probe/primer against the SILVA database (TestProbe 3.0) |
| `silva_testprime` | Evaluate a primer pair's coverage and specificity (TestPrime 1.0) |
| `silva_browser` | Get the SILVA taxonomy browser URL for a sequence |
| `silva_list_databases` | List available databases and their taxonomies |

## Prerequisites

- **Node.js** ≥ 18.0.0 (tested on Node.js 20+)
- An MCP-compatible client (e.g., [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com/), or any [MCP SDK](https://modelcontextprotocol.io/) consumer)

## Installation

### Option 1: From Source

```bash
# Clone the repository
git clone https://github.com/SILVA-MCP/silva-mcp.git
cd SILVA-MCP

# Install dependencies
npm install

# Build
npm run build
```

### Option 2: Using npm (if published)

```bash
npm install -g silva-mcp
```

## Configuration

Add the SILVA-MCP server to your MCP client's configuration file.

### Claude Desktop (`claude_desktop_config.json`)

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/SILVA-MCP/dist/index.js"]
    }
  }
}
```

### Cursor

In Cursor's MCP settings (`Settings` → `MCP`):

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/SILVA-MCP/dist/index.js"]
    }
  }
}
```

### Using npx (if published to npm)

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "npx",
      "args": ["-y", "silva-mcp"]
    }
  }
}
```

## Usage

Once configured, the tools are available to your AI assistant. You can ask questions like:

- *"Search the SILVA database for sequences from the organism Escherichia coli"*
- *"Find the sequence detail for SILVA ID 12893389 in the SSU database"*
- *"Test the probe CGCCTCCCTCTACCGTTT against the SSU RefNR database with 1 mismatch"*
- *"Evaluate the primer pair AGAGTTTGATCCTGGCTCAG and GGTTACCTTGTTACGACTT against SSU r144"*
- *"What databases are available in SILVA?"*

## Tool Reference

### `silva_search`

Search the SILVA rRNA database for sequences matching one or more criteria.

**Input Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | No | `"ssu-144"` | SILVA database to search |
| `criteria` | Array | Yes | — | Search criteria (all must match, AND logic) |
| `criteria[].field` | String | Yes | — | Field name (see below) |
| `criteria[].text` | String | Yes | — | Search text |
| `sort` | String | No | — | Sort field |
| `sortOrder` | `"asc"` \| `"desc"` | No | `"asc"` | Sort order |
| `offset` | Number | No | `0` | Starting offset (0-based) |
| `limit` | Number | No | `25` | Max results (1–100) |
| `onlyRef` | Boolean | No | `false` | Filter: only Ref sequences |
| `onlyRefNR` | Boolean | No | `false` | Filter: only RefNR sequences |

**Available search fields:**

| Field ID | Field Name |
|---|---|
| 0 | organism name |
| 1 | accession number |
| 2 | strain |
| 3 | publication ID |
| 4 | publication |
| 5 | sequence length |
| 6 | sequence quality |
| 7 | alignment quality |
| 8 | alignment identity |
| 9 | taxonomy |
| 10 | sequence entry |
| 11 | date submitted |
| 12 | genome project ID |
| 13 | straininfo.net ID |
| 14 | NCBI tax ID |

**Example:**

```json
{
  "database": "ssu-144",
  "criteria": [
    { "field": "organism name", "text": "Escherichia" }
  ],
  "limit": 10
}
```

**Output:**

```json
{
  "database": "ssu-144",
  "totalRegions": 388740,
  "totalAccessions": 323687,
  "totalPages": 15550,
  "currentPage": 1,
  "returned": 25,
  "sequences": [
    {
      "silvaId": "12893389",
      "accession": "X80733",
      "organismName": "Escherichia",
      "sequenceLength": 1447,
      "sequenceQuality": 87.33,
      "alignmentQuality": 100.00,
      "taxonomy": "Bacteria > Pseudomonadati > Pseudomonadota > Gammaproteobacteria > Enterobacterales > Enterobacteriaceae > Escherichia-Shigella"
    }
  ]
}
```

---

### `silva_sequence_detail`

Get detailed information about a specific sequence.

**Input Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | Yes | SILVA database |
| `silvaId` | String | Yes | Internal SILVA sequence ID (from search results) |

**Output:** A `SequenceDetail` object including:
- General information (accession, organism, strain, dates)
- Taxonomy under multiple classification systems (SILVA, LPSN, GTDB, ENA, LTP, RDP)
- Environment metadata (country, coordinates, collection date, etc.)
- Features (product, quality scores, ambiguity, alignment identity)
- Publication references (title, authors, PubMed links)

---

### `silva_testprobe`

Submit a TestProbe job to find all occurrences of a probe or primer sequence in the SILVA database.

**Input Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `probe` | String | Yes | — | Probe sequence (12–36 nt, IUPAC codes) |
| `database` | `"ssu-144"` \| `"lsu-138.2"` | No | `"ssu-144"` | SILVA database |
| `databaseType` | `"ref"` \| `"nr"` | No | `"nr"` | Database type |
| `mismatches` | Number | No | `0` | Allowed mismatches (0–5) |
| `nmatches` | Number | No | `0` | Required 3′ end matches (0–4) |
| `weightedMismatches` | Boolean | No | `false` | Use weighted mismatches |
| `reverseProbe` | Boolean | No | `true` | Search reverse complement |
| `complementProbe` | Boolean | No | `true` | Search complement |
| `jobName` | String | No | — | Job name for identification |

**Example:**

```json
{
  "probe": "CGCCTCCCTCTACCGTTT",
  "database": "ssu-144",
  "databaseType": "nr",
  "mismatches": 1,
  "jobName": "Nev656_test"
}
```

**Output:** Job ID, status, and a web URL to view results in the SILVA browser.

---

### `silva_testprime`

Submit a TestPrime job to evaluate a primer pair's coverage and specificity.

**Input Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `forwardPrimer` | String | Yes | — | Forward primer (5′→3′, ≥12 nt, IUPAC) |
| `reversePrimer` | String | Yes | — | Reverse primer (5′→3′, ≥12 nt, IUPAC) |
| `database` | `"ssu-144"` \| `"lsu-138.2"` | No | `"ssu-144"` | SILVA database |
| `databaseType` | `"ref"` \| `"nr"` | No | `"nr"` | Database type |
| `mismatches` | Number | No | `0` | Max mismatches per primer (0–5) |
| `mismatchRegion` | Number | No | `0` | 3′ 0-mismatch zone length (0–5) |
| `weightedMismatches` | Boolean | No | `false` | Use weighted mismatches |
| `complementReverseProbe` | Boolean | No | `false` | Complement reverse primer |
| `jobName` | String | No | — | Job name |

**Example:**

```json
{
  "forwardPrimer": "AGAGTTTGATCCTGGCTCAG",
  "reversePrimer": "GGTTACCTTGTTACGACTT",
  "database": "ssu-144",
  "mismatches": 1,
  "jobName": "27F_1492R_test"
}
```

**Output:** Job ID, status, and a web URL to view results.

---

### `silva_browser`

Generate a URL to view a sequence in the SILVA taxonomy browser.

**Input Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | No | SILVA database |
| `accession` | String | Yes | Accession number or `"cart"` |

**Output:** URL string.

---

### `silva_list_databases`

List all available SILVA databases and their supported taxonomy classification systems.

**Input Parameters:** None.

**Output:**

```json
{
  "databases": [
    {
      "id": "ssu-144",
      "name": "SSU r144 (Small Subunit / 16S / 18S)",
      "taxonomies": ["silva", "silva-ref", "silva-ref-nr", "lpsn", "ltp", "embl-ebi/ena", "gtdb"]
    },
    {
      "id": "lsu-138.2",
      "name": "LSU r138.2 (Large Subunit / 23S / 28S)",
      "taxonomies": ["silva", "silva-ref", "silva-ref-nr", "ltp", "embl-ebi/ena", "gtdb", "rdp"]
    }
  ]
}
```

## Architecture

```
SILVA-MCP/
├── package.json          # npm package configuration
├── tsconfig.json         # TypeScript compiler configuration
├── .gitignore            # Git ignore rules
├── README.md             # Quick start guide
├── README.en.md          # English documentation (this file)
├── README.zh.md          # Chinese documentation
├── LICENSE               # MIT license
└── src/
    ├── index.ts          # MCP server entry point (stdio transport)
    ├── tools.ts          # Tool definitions and dispatch handlers
    ├── silvaClient.ts    # SILVA web-service API client
    ├── constants.ts      # Database constants and field mappings
    ├── types.ts          # TypeScript type definitions
    └── htmlParser.ts     # HTML parsing utilities for API responses
```

### Data Flow

1. The MCP client (e.g., Claude Desktop) sends a tool-call request via stdio.
2. `index.ts` receives the request and dispatches to `tools.ts`.
3. `tools.ts` validates the arguments with Zod schemas and calls the corresponding function in `silvaClient.ts`.
4. `silvaClient.ts` makes an HTTP POST to `https://legatum.arb-silva.de/WS/` with the appropriate parameters.
5. The SILVA backend returns JSON with embedded HTML fragments.
6. `htmlParser.ts` utilities extract structured data from the HTML.
7. The parsed result is returned as JSON to the MCP client.

### SILVA Web Service

The SILVA web tools (Search, TestProbe, TestPrime, Browser) are backed by a JSON web service at:

```
POST https://legatum.arb-silva.de/WS/
Content-Type: application/x-www-form-urlencoded
```

Parameters use the `tx_pmtree_pi1[...]` naming convention. This MCP server wraps these calls and parses the responses into clean JSON objects.

## Development

### Build

```bash
npm run build      # Compile TypeScript to dist/
npm run clean      # Remove dist/
npm run dev        # Build and run
```

### Project Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript source to `dist/` |
| `npm start` | Run the compiled server (`node dist/index.js`) |
| `npm run dev` | Build and run in one step |
| `npm run clean` | Remove the `dist/` directory |
| `npm run prepublishOnly` | Auto clean and build before publishing (triggered by npm) |

### Key Dependencies

| Package | Purpose |
|---|---|
| [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | MCP server SDK |
| [`zod`](https://www.npmjs.com/package/zod) | Runtime schema validation for tool inputs |

## SILVA Database Background

**SILVA** (from Latin *silva*, meaning "forest") is a comprehensive online resource for ribosomal RNA (rRNA) sequence data. It is maintained by the [Microbial Ecology Group](https://www.arb-silva.de/contact/team/) at the [DSMZ](https://www.dsmz.de/) and the [Technical University of Munich](https://www.tum.de/).

Key facts:
- **Release 144** (current): Contains over 2.2 million SSU and 350,000 LSU aligned rRNA sequences.
- **SSU (Small Subunit)**: 16S (Bacteria/Archaea) and 18S (Eukarya) rRNA — primary marker gene for microbial taxonomy.
- **LSU (Large Subunit)**: 23S (Bacteria/Archaea) and 28S (Eukarya) rRNA.
- **Quality filtering**: Sequences are checked for ambiguities, vector contamination, and alignment quality.
- **Taxonomy**: SILVA provides its own taxonomy, plus mappings to LPSN, GTDB, ENA, LTP, and RDP.

### Databases

| Database ID | Description |
|---|---|
| `ssu-144` | SSU Ref/RefNR release 144 (16S/18S) |
| `lsu-138.2` | LSU Ref/RefNR release 138.2 (23S/28S) |

### Database Types

| Type | Description |
|---|---|
| `ref` | Ref — quality-filtered, aligned sequences |
| `nr` | RefNR — non-redundant subset of Ref (reduced near-identical sequences) |

## License

MIT License — see the [LICENSE](./LICENSE) file for details.

## Citation

If you use SILVA data in your research, please cite:

> Quast C, Pruesse E, Yilmaz P, Gerken J, Schweer T, Yarza P, Peplies J, Glöckner FO (2013)
> The SILVA ribosomal RNA gene database project: improved data processing and web-based tools.
> *Nucleic Acids Research* 41(D1): D590-D596. doi: [10.1093/nar/gks1219](https://doi.org/10.1093/nar/gks1219)

For this MCP server:

> SILVA-MCP: A Model Context Protocol Server for the SILVA rRNA Database. Version 0.1.0.

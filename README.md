# SILVA-MCP

> A Model Context Protocol (MCP) Server for the [SILVA rRNA Database](https://www.arb-silva.de/)
>
> Version: 0.1.0 | MIT License

> **Disclaimer:** This is an **unofficial** community-driven project and is not affiliated with, endorsed by, or officially connected to SILVA, DSMZ, or the SILVA rRNA database team. SILVA is a registered trademark of its respective owners. For the official SILVA website, please visit [https://www.arb-silva.de/](https://www.arb-silva.de/).

[English](./README.en.md) | [中文文档](./README.zh.md)

## Quick Start

```bash
npm install
npm run build
node dist/index.js
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "node",
      "args": ["/path/to/SILVA-MCP/dist/index.js"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `silva_search` | Search rRNA sequences by organism, accession, taxonomy, etc. |
| `silva_sequence_detail` | Get detailed metadata for a sequence |
| `silva_testprobe` | Match a probe/primer against SILVA (TestProbe 3.0) |
| `silva_testprime` | Evaluate a primer pair's coverage (TestPrime 1.0) |
| `silva_browser` | Get the SILVA browser URL for a sequence |
| `silva_list_databases` | List available databases and taxonomies |

# SILVA-MCP

> **适配 [SILVA rRNA 数据库](https://www.arb-silva.de/) 的模型上下文协议 (MCP) 服务器**
>
> 版本：0.1.0
>
> **中文** | [English Documentation](./README.en.md)

---

> **免责声明：** 这是一个**非官方的**社区驱动项目，与 SILVA、DSMZ 或 SILVA rRNA 数据库团队没有任何隶属关系，也未获得其认可或官方支持。SILVA 是其各自所有者的注册商标。如需访问 SILVA 官方网站，请前往 [https://www.arb-silva.de/](https://www.arb-silva.de/)。

---

## 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [可用工具](#可用工具)
- [前置要求](#前置要求)
- [安装](#安装)
- [配置](#配置)
- [使用方法](#使用方法)
- [工具详解](#工具详解)
- [架构设计](#架构设计)
- [开发说明](#开发说明)
- [SILVA 数据库背景](#silva-数据库背景)
- [许可证](#许可证)
- [引用文献](#引用文献)

---

## 概述

**SILVA-MCP** 是一个[模型上下文协议](https://modelcontextprotocol.io/)（Model Context Protocol, MCP）服务器，将 SILVA rRNA 数据库的 Web 服务 API 暴露为可被大语言模型（LLM）调用的工具。它使 AI 助手能够通过标准化的 MCP 接口搜索序列、检索详细元数据、匹配探针和引物，以及浏览 SILVA 分类学树。

SILVA 是一个综合性 rRNA 序列在线资源库，由 [DSMZ](https://www.dsmz.de/)（德国微生物和细胞培养物保存中心）维护，提供质量检查并定期更新的小亚基（16S/18S, SSU）和大亚基（23S/28S, LSU）核糖体 RNA 序列比对数据库，覆盖生命三域（细菌、古菌、真核生物）。

## 功能特性

- **序列搜索** — 按生物体名称、登录号、菌株、分类学、序列长度、质量等多字段检索 SILVA 数据库，支持多字段 AND 逻辑组合查询。
- **序列详情检索** — 获取单条序列的完整元数据，包括多分类系统下的分类路径（SILVA、LPSN、GTDB、ENA 等）、环境元数据、质量指标和文献引用。
- **TestProbe（探针/引物匹配）** — 提交探针或引物序列，在 SILVA 数据库中查找所有匹配序列，可配置错配容忍度。
- **TestPrime（引物对评估）** — 评估正向/反向引物对在整个 SILVA 数据库中的覆盖率和特异性。
- **分类浏览器 URL 生成** — 生成指向 SILVA 分类浏览器的直接链接，便于交互式探索。
- **数据库列表** — 枚举可用数据库及其支持的分类系统。

## 可用工具

| 工具名称 | 描述 |
|---|---|
| `silva_search` | 搜索匹配一个或多个条件的 rRNA 序列 |
| `silva_sequence_detail` | 获取单条序列的详细信息 |
| `silva_testprobe` | 在 SILVA 数据库中匹配探针/引物 (TestProbe 3.0) |
| `silva_testprime` | 评估引物对的覆盖率和特异性 (TestPrime 1.0) |
| `silva_browser` | 获取序列在 SILVA 分类浏览器中的 URL |
| `silva_list_databases` | 列出可用数据库及其分类系统 |

## 前置要求

- **Node.js** ≥ 18.0.0（已在 Node.js 20+ 上测试通过）
- 一个兼容 MCP 的客户端（如 [Claude Desktop](https://claude.ai/download)、[Cursor](https://cursor.com/) 或任何基于 [MCP SDK](https://modelcontextprotocol.io/) 的消费者）

## 安装

### 方式一：从源码安装

```bash
# 克隆仓库
git clone https://github.com/SILVA-MCP/silva-mcp.git
cd SILVA-MCP

# 安装依赖
npm install

# 编译
npm run build
```

### 方式二：使用 npm（如已发布）

```bash
npm install -g silva-mcp
```

## 配置

将 SILVA-MCP 服务器添加到 MCP 客户端的配置文件中。

### Claude Desktop (`claude_desktop_config.json`)

**macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "node",
      "args": ["/绝对路径/SILVA-MCP/dist/index.js"]
    }
  }
}
```

### Cursor

在 Cursor 的 MCP 设置中（`设置` → `MCP`）：

```json
{
  "mcpServers": {
    "silva-mcp": {
      "command": "node",
      "args": ["/绝对路径/SILVA-MCP/dist/index.js"]
    }
  }
}
```

### 使用 npx（如已发布到 npm）

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

## 使用方法

配置完成后，工具即对 AI 助手可用。你可以提出如下问题：

- *"在 SILVA 数据库中搜索来自大肠杆菌 (Escherichia coli) 的序列"*
- *"获取 SSU 数据库中 SILVA ID 为 12893389 的序列详情"*
- *"将探针 CGCCTCCCTCTACCGTTT 在 SSU RefNR 数据库中匹配，允许 1 个错配"*
- *"评估引物对 AGAGTTTGATCCTGGCTCAG 和 GGTTACCTTGTTACGACTT 在 SSU r144 中的覆盖率"*
- *"SILVA 数据库中有哪些可用的数据库？"*

## 工具详解

### `silva_search`

在 SILVA rRNA 数据库中搜索匹配一个或多个条件的序列。

**输入参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | 否 | `"ssu-144"` | SILVA 数据库 |
| `criteria` | 数组 | 是 | — | 搜索条件（全部须满足，AND 逻辑） |
| `criteria[].field` | 字符串 | 是 | — | 字段名称（见下表） |
| `criteria[].text` | 字符串 | 是 | — | 搜索文本 |
| `sort` | 字符串 | 否 | — | 排序字段 |
| `sortOrder` | `"asc"` \| `"desc"` | 否 | `"asc"` | 排序方向 |
| `offset` | 数字 | 否 | `0` | 起始偏移量（从 0 开始） |
| `limit` | 数字 | 否 | `25` | 最大返回结果数 (1–100) |
| `onlyRef` | 布尔值 | 否 | `false` | 筛选：仅 Ref 序列 |
| `onlyRefNR` | 布尔值 | 否 | `false` | 筛选：仅 RefNR 序列 |

**可用搜索字段：**

| 字段 ID | 字段名称 | 说明 |
|---|---|---|
| 0 | organism name | 生物体名称 |
| 1 | accession number | 登录号 |
| 2 | strain | 菌株 |
| 3 | publication ID | 文献 ID |
| 4 | publication | 文献 |
| 5 | sequence length | 序列长度 |
| 6 | sequence quality | 序列质量 |
| 7 | alignment quality | 比对质量 |
| 8 | alignment identity | 比对一致性 |
| 9 | taxonomy | 分类学 |
| 10 | sequence entry | 序列条目 |
| 11 | date submitted | 提交日期 |
| 12 | genome project ID | 基因组项目 ID |
| 13 | straininfo.net ID | straininfo.net ID |
| 14 | NCBI tax ID | NCBI 分类 ID |

**示例：**

```json
{
  "database": "ssu-144",
  "criteria": [
    { "field": "organism name", "text": "Escherichia" }
  ],
  "limit": 10
}
```

**输出：**

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

获取单条序列的详细信息。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | 是 | SILVA 数据库 |
| `silvaId` | 字符串 | 是 | SILVA 内部序列 ID（来自搜索结果） |

**输出：** 一个 `SequenceDetail` 对象，包含：
- 基本信息（登录号、生物体名、菌株、日期）
- 多分类系统下的分类路径（SILVA、LPSN、GTDB、ENA、LTP、RDP）
- 环境元数据（国家、坐标、采集日期等）
- 特征信息（产物、质量分数、模糊度、比对一致性）
- 文献引用（标题、作者、PubMed 链接）

---

### `silva_testprobe`

提交 TestProbe 作业，在 SILVA 数据库中查找探针或引物序列的所有出现位置。

**输入参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `probe` | 字符串 | 是 | — | 探针序列 (12–36 nt, IUPAC 编码) |
| `database` | `"ssu-144"` \| `"lsu-138.2"` | 否 | `"ssu-144"` | SILVA 数据库 |
| `databaseType` | `"ref"` \| `"nr"` | 否 | `"nr"` | 数据库类型 |
| `mismatches` | 数字 | 否 | `0` | 允许错配数 (0–5) |
| `nmatches` | 数字 | 否 | `0` | 3'端所需匹配数 (0–4) |
| `weightedMismatches` | 布尔值 | 否 | `false` | 使用加权错配 |
| `reverseProbe` | 布尔值 | 否 | `true` | 搜索反向互补链 |
| `complementProbe` | 布尔值 | 否 | `true` | 搜索互补链 |
| `jobName` | 字符串 | 否 | — | 作业名称（便于标识） |

**示例：**

```json
{
  "probe": "CGCCTCCCTCTACCGTTT",
  "database": "ssu-144",
  "databaseType": "nr",
  "mismatches": 1,
  "jobName": "Nev656_test"
}
```

**输出：** 作业 ID、状态以及查看结果的网页 URL。

---

### `silva_testprime`

提交 TestPrime 作业，评估引物对的覆盖率和特异性。

**输入参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `forwardPrimer` | 字符串 | 是 | — | 正向引物 (5′→3′, ≥12 nt, IUPAC) |
| `reversePrimer` | 字符串 | 是 | — | 反向引物 (5′→3′, ≥12 nt, IUPAC) |
| `database` | `"ssu-144"` \| `"lsu-138.2"` | 否 | `"ssu-144"` | SILVA 数据库 |
| `databaseType` | `"ref"` \| `"nr"` | 否 | `"nr"` | 数据库类型 |
| `mismatches` | 数字 | 否 | `0` | 每条引物最大错配数 (0–5) |
| `mismatchRegion` | 数字 | 否 | `0` | 3'端 0 错配区长度 (0–5) |
| `weightedMismatches` | 布尔值 | 否 | `false` | 使用加权错配 |
| `complementReverseProbe` | 布尔值 | 否 | `false` | 对反向引物取互补链 |
| `jobName` | 字符串 | 否 | — | 作业名称 |

**示例：**

```json
{
  "forwardPrimer": "AGAGTTTGATCCTGGCTCAG",
  "reversePrimer": "GGTTACCTTGTTACGACTT",
  "database": "ssu-144",
  "mismatches": 1,
  "jobName": "27F_1492R_test"
}
```

**输出：** 作业 ID、状态以及查看结果的网页 URL。

---

### `silva_browser`

生成在 SILVA 分类浏览器中查看序列的 URL。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `database` | `"ssu-144"` \| `"lsu-138.2"` | 否 | SILVA 数据库 |
| `accession` | 字符串 | 是 | 登录号或 `"cart"`（查看购物车） |

**输出：** URL 字符串。

---

### `silva_list_databases`

列出所有可用的 SILVA 数据库及其支持的分类系统。

**输入参数：** 无。

**输出：**

```json
{
  "databases": [
    {
      "id": "ssu-144",
      "name": "SSU r144 (小亚基 / 16S / 18S)",
      "taxonomies": ["silva", "silva-ref", "silva-ref-nr", "lpsn", "ltp", "embl-ebi/ena", "gtdb"]
    },
    {
      "id": "lsu-138.2",
      "name": "LSU r138.2 (大亚基 / 23S / 28S)",
      "taxonomies": ["silva", "silva-ref", "silva-ref-nr", "ltp", "embl-ebi/ena", "gtdb", "rdp"]
    }
  ]
}
```

## 架构设计

SILVA-MCP/
├── package.json          # npm 包配置
├── tsconfig.json         # TypeScript 编译器配置
├── .gitignore            # Git 忽略文件配置
├── README.md             # 快速开始指南
├── README.en.md          # 英文文档
├── README.zh.md          # 中文文档（本文件）
├── LICENSE               # MIT 许可证
└── src/
    ├── index.ts          # MCP 服务器入口点（stdio 传输）
    ├── tools.ts          # 工具定义和分发处理器
    ├── silvaClient.ts    # SILVA Web 服务 API 客户端
    ├── constants.ts      # 数据库常量和字段映射
    ├── types.ts          # TypeScript 类型定义
    └── htmlParser.ts     # HTML 解析工具（用于 API 响应解析）
```

### 数据流

1. MCP 客户端（如 Claude Desktop）通过 stdio 发送工具调用请求。
2. `index.ts` 接收请求并分发至 `tools.ts`。
3. `tools.ts` 使用 Zod 模式验证参数，调用 `silvaClient.ts` 中对应的函数。
4. `silvaClient.ts` 向 `https://legatum.arb-silva.de/WS/` 发送 HTTP POST 请求。
5. SILVA 后端返回包含内嵌 HTML 片段的 JSON。
6. `htmlParser.ts` 工具从 HTML 中提取结构化数据。
7. 解析后的结果以 JSON 格式返回给 MCP 客户端。

### SILVA Web 服务

SILVA 的 Web 工具（Search、TestProbe、TestPrime、Browser）由以下 JSON Web 服务支撑：

```
POST https://legatum.arb-silva.de/WS/
Content-Type: application/x-www-form-urlencoded
```

参数使用 `tx_pmtree_pi1[...]` 命名约定。本 MCP 服务器封装了这些调用并将响应解析为清晰的 JSON 对象。

## 开发说明

### 编译

```bash
npm run build      # 编译 TypeScript 到 dist/
npm run clean      # 清理 dist/
npm run dev        # 编译并运行
```

### 项目脚本

| 脚本 | 说明 |
|---|---|
| `npm run build` | 编译 TypeScript 源码到 `dist/` |
| `npm start` | 运行编译后的服务器 (`node dist/index.js`) |
| `npm run dev` | 一步完成编译和运行 |
| `npm run clean` | 清理 `dist/` 目录 |
| `npm run prepublishOnly` | 发布前自动清理并编译（由 npm 自动触发） |

### 核心依赖

| 包 | 用途 |
|---|---|
| [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | MCP 服务器 SDK |
| [`zod`](https://www.npmjs.com/package/zod) | 工具输入的运行时模式验证 |

## SILVA 数据库背景

**SILVA**（源自拉丁语 *silva*，意为"森林"）是一个综合性 rRNA 序列在线资源库，由 [DSMZ](https://www.dsmz.de/) 的微生物生态学研究组维护。

关键信息：
- **第 144 版**（当前版本）：包含超过 220 万条 SSU 和 35 万条 LSU 比对好的 rRNA 序列。
- **SSU（小亚基）**：16S（细菌/古菌）和 18S（真核生物）rRNA — 微生物分类学的主要标记基因。
- **LSU（大亚基）**：23S（细菌/古菌）和 28S（真核生物）rRNA。
- **质量过滤**：序列经过模糊度、载体污染和比对质量检查。
- **分类学**：SILVA 提供自有分类体系，并提供到 LPSN、GTDB、ENA、LTP 和 RDP 的映射。

### 数据库

| 数据库 ID | 说明 |
|---|---|
| `ssu-144` | SSU Ref/RefNR 第 144 版（16S/18S） |
| `lsu-138.2` | LSU Ref/RefNR 第 138.2 版（23S/28S） |

### 数据库类型

| 类型 | 说明 |
|---|---|
| `ref` | Ref — 经质量过滤、比对的序列 |
| `nr` | RefNR — Ref 的非冗余子集（减少了近似重复序列） |

## 许可证

MIT 许可证 — 详见 [LICENSE](./LICENSE) 文件。

## 引用文献

如在研究中使用了 SILVA 数据，请引用：

> Quast C, Pruesse E, Yilmaz P, Gerken J, Schweer T, Yarza P, Peplies J, Glöckner FO (2013)
> The SILVA ribosomal RNA gene database project: improved data processing and web-based tools.
> *Nucleic Acids Research* 41(D1): D590-D596. doi: [10.1093/nar/gks1219](https://doi.org/10.1093/nar/gks1219)

引用本 MCP 服务器：

> SILVA-MCP: 适配 SILVA rRNA 数据库的模型上下文协议服务器. 版本 0.1.0.

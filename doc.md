# Content to PDF — Documentation

## Overview

**Content to PDF** is a web application that generates print-ready PDFs from Bitcoin Educational Content (BEC) courses and quizzes hosted on GitHub. Users select a course and language in the browser, preview the output, and save it as a PDF using the browser's native print dialog.

| | |
|---|---|
| **Stack** | SvelteKit 2 · Svelte 5 · Tailwind CSS v4 · TypeScript |
| **Runtime** | OpenWorkers (Cloudflare Workers-compatible edge) |
| **Dev** | Bun / Vite 7 |
| **Content source** | [bitcoin-educational-content](https://github.com/PlanB-Network/bitcoin-educational-content) (GitHub API) |
| **PDF engine** | Browser `window.print()` with print-optimized CSS |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Browser (Client)                    │
│                                                  │
│  +page.svelte                                    │
│  ├─ GeneratorForm  (course/lang/mode selector)   │
│  ├─ PdfPreview     (iframe + "Save as PDF")      │
│  └─ Nav            (header bar)                  │
└──────────────┬──────────────────────────────────┘
               │ fetch()
┌──────────────▼──────────────────────────────────┐
│              Server (Edge Worker)                 │
│                                                  │
│  GET  /api/courses     → list courses + langs    │
│  POST /api/generate    → return full HTML doc    │
│                                                  │
│  Pipeline:                                       │
│  1. Fetch content from GitHub (parallel)         │
│  2. Parse markdown (frontmatter, parts, chapters)│
│  3. Render to HTML via templates                 │
│  4. Return complete HTML with print CSS          │
└──────────────┬──────────────────────────────────┘
               │ fetch()
┌──────────────▼──────────────────────────────────┐
│              GitHub (External)                    │
│                                                  │
│  Raw content:  raw.githubusercontent.com         │
│  Tree API:     api.github.com/repos/.../git/trees│
│  Repos:                                          │
│  - PlanB-Network/bitcoin-educational-content     │
│  - PlanB-Network/bitcoin-learning-management-system │
└─────────────────────────────────────────────────┘
```

---

## Project Structure

```
content-to-pdf/
├── package.json              # Dependencies & scripts
├── svelte.config.js          # OpenWorkers adapter config
├── vite.config.ts            # Tailwind + SvelteKit + SSR config
├── tsconfig.json             # TypeScript (extends .svelte-kit)
├── .env.example              # Optional GITHUB_TOKEN
├── scripts/
│   └── patch-adapter.ts      # Post-install fixes (Windows + punycode.js)
│
└── src/
    ├── app.html              # HTML shell
    ├── app.css               # Tailwind entry
    ├── app.d.ts              # Global types (App.Platform)
    │
    ├── lib/
    │   ├── types.ts          # Shared types (CourseInfo, GenerateRequest, etc.)
    │   ├── utils.ts          # formatCourseCode, getLanguageName, escapeHtml
    │   ├── i18n.ts           # Translation with fallback chain
    │   ├── markdown.ts       # Frontmatter extraction, course parsing, markdown→HTML
    │   │
    │   ├── server/
    │   │   ├── env.ts        # Cross-runtime env access (process.env / platform.env)
    │   │   └── github.ts     # GitHub API client (list courses, fetch content, quiz)
    │   │
    │   ├── templates/
    │   │   ├── styles.ts     # Print-optimized CSS (A4, page breaks, PBN branding)
    │   │   ├── cover.ts      # Cover page HTML generator
    │   │   ├── course.ts     # TOC, body, final page generators
    │   │   └── quiz.ts       # Question shuffle, quiz body, answer key generators
    │   │
    │   └── components/
    │       ├── Nav.svelte           # Top navigation bar
    │       ├── GeneratorForm.svelte # Course/language/mode selector form
    │       └── PdfPreview.svelte    # Iframe preview + print button
    │
    └── routes/
        ├── +layout.svelte          # App shell (Nav + slot)
        ├── +page.svelte            # Main page (form + preview)
        ├── +page.server.ts         # Server load: list courses
        └── api/
            ├── courses/+server.ts  # GET: list available courses
            └── generate/+server.ts # POST: generate course/quiz HTML
```

---

## How It Works

### Course PDF Generation

1. User selects a course code (e.g. `btc101`) and language (e.g. `en`)
2. Server fetches in parallel from GitHub:
   - `courses/btc101/en.md` — course markdown
   - `courses/btc101/course.yml` — metadata (level, hours, topic)
   - BLMS locale file — translations
3. Parses the markdown:
   - Extracts YAML frontmatter (name, goal, objectives)
   - Splits into parts (`# Title` + `<partId>`) and chapters (`## Title` + `<chapterId>`)
   - Cleans metadata tags, UUIDs, stray lines
4. Generates HTML sections:
   - **Cover page** — title, code, language, date, goal, objectives
   - **Table of contents** — numbered list with anchor links
   - **Body** — part headers + chapter headers + rendered markdown content
   - **Final page** — QR code linking to the course review page
5. Wraps everything in a complete HTML document with print-optimized CSS
6. Client displays in an iframe; "Save as PDF" opens browser print dialog

### Quiz PDF Generation

Same flow, but instead of markdown parsing:
1. Fetches quiz questions from `courses/{code}/quizz/*/question.yml` + `{lang}.yml`
2. Optionally limits to N random questions (Fisher-Yates shuffle)
3. Shuffles answer choices (A/B/C/D) for each question
4. Generates quiz body + optional answer key with explanations

---

## API Reference

### `GET /api/courses`

Returns all available courses with their languages.

**Response:**
```json
[
  { "code": "btc101", "languages": ["en", "fr", "es", "de", ...] },
  { "code": "min201", "languages": ["en", "fr", ...] }
]
```

### `POST /api/generate`

Generates a complete printable HTML document.

**Request body:**
```json
{
  "code": "btc101",
  "lang": "en",
  "mode": "course",
  "count": 20,
  "answers": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | yes | Course code (e.g. `btc101`) |
| `lang` | string | yes | Language code (e.g. `en`, `fr`) |
| `mode` | `"course"` \| `"quiz"` | yes | Generation mode |
| `count` | number | no | Limit quiz to N random questions |
| `answers` | boolean | no | Include answer key (quiz only) |

**Response:**
```json
{
  "html": "<!DOCTYPE html>...",
  "title": "The Bitcoin Journey"
}
```

---

## Development

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- Git

### Setup

```bash
git clone <repo-url>
cd content-to-pdf
npm install          # or: bun install
```

### Optional: GitHub Token

For higher API rate limits (5000/hr instead of 60/hr), create a `.env` file:

```env
GITHUB_TOKEN=ghp_your_token_here
```

### Run Dev Server

```bash
npm run dev          # or: bun run dev
```

Opens at `http://localhost:5173/`.

### Build for Production

```bash
npm run build        # outputs to build/
```

### Deploy to OpenWorkers

```bash
npm run deploy       # production
npm run deploy:dev   # staging
```

---

## Edge Compatibility Notes

The app runs on Cloudflare Workers-compatible edge runtimes with no Node.js APIs. Several adaptations were made:

| Problem | Solution |
|---------|----------|
| `gray-matter` uses `fs` | Replaced with manual YAML frontmatter parser using `yaml` package |
| `qrcode` uses `fs` | Replaced with external QR API (`api.qrserver.com`) |
| `puppeteer` for PDF | Replaced with browser `window.print()` + print CSS |
| `markdown-it` → `punycode.js` resolution fails in esbuild neutral mode | `scripts/patch-adapter.ts` adds `"module"` field to punycode.js; Vite alias + `ssr.noExternal` |
| `dotenv` / `commander` | Removed; SvelteKit env + web UI replace CLI |
| Local filesystem content | GitHub raw URLs + Tree API |

---

## i18n (Internationalization)

The `t()` function resolves translations with a 3-tier fallback:

1. **Requested locale** — fetched from BLMS repo (`/locales/{lang}.json`)
2. **English locale** — fetched from BLMS repo (`/locales/en.json`)
3. **Hardcoded defaults** — built into `src/lib/i18n.ts`

This ensures PDFs always render even if the BLMS repo is unreachable.

---

## Content Source (GitHub)

All content is fetched at runtime from:

- **BEC repo**: `PlanB-Network/bitcoin-educational-content` (branch: `dev`)
  - Course markdown: `courses/{code}/{lang}.md`
  - Course metadata: `courses/{code}/course.yml`
  - Quiz questions: `courses/{code}/quizz/{id}/question.yml` + `{lang}.yml`
  - Images: `courses/{code}/assets/{lang}/{filename}`
- **BLMS repo**: `PlanB-Network/bitcoin-learning-management-system` (branch: `main`)
  - Locale files: `apps/academy/public/locales/{lang}.json`

The course list is cached in-memory for 10 minutes to reduce GitHub API calls.

---

## Key Files for Future Work

| If you want to... | Edit... |
|---|---|
| Add a new HTML section to PDFs | `src/lib/templates/course.ts` or `quiz.ts` |
| Change PDF styling | `src/lib/templates/styles.ts` |
| Modify cover page layout | `src/lib/templates/cover.ts` |
| Add a new content source | `src/lib/server/github.ts` |
| Change UI appearance | `src/lib/components/*.svelte` |
| Add new API endpoints | `src/routes/api/` |
| Add authentication | `src/hooks.server.ts` (create it, see page-to-resources for pattern) |
| Add a database | `src/lib/server/database.ts` (see page-to-resources for pattern) |
| Support new quiz formats | `src/lib/templates/quiz.ts` + `src/lib/server/github.ts` |
| Add new languages to the UI | `src/lib/utils.ts` → `getLanguageName()` |

---

## History

**v1.0.0** — CLI tool using Puppeteer, local filesystem, commander.js
**v2.0.0** — Web app (SvelteKit + OpenWorkers), GitHub API, browser print

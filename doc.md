# Content to PDF — Documentation

## Overview

**Content to PDF** is a web application that generates print-ready PDFs from Bitcoin Educational Content (BEC) courses and quizzes hosted on GitHub. Users select a course and language in the browser, preview the output, and save it as a PDF using the browser's native print dialog.

| | |
|---|---|
| **Version** | 2.4.0 |
| **Stack** | SvelteKit 2 · Svelte 5 (runes) · Tailwind CSS v4 · TypeScript |
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
│  │   └─ fetches en.md from GitHub for names      │
│  ├─ PdfPreview     (iframe + "Save as PDF")      │
│  └─ Nav            (header bar)                  │
└──────────────┬──────────────────────────────────┘
               │ fetch()
┌──────────────▼──────────────────────────────────┐
│              Server (Edge Worker)                 │
│                                                  │
│  GET  /api/courses     → list courses            │
│  GET  /api/languages   → languages per course    │
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
│  Contents API: api.github.com/repos/.../contents │
│  GraphQL API:  api.github.com/graphql            │
│  Repos:                                          │
│  - PlanB-Network/bitcoin-educational-content     │
│  - PlanB-Network/bitcoin-learning-management-sys │
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
    ├── app.css               # Tailwind v4 entry + custom theme (planb-orange, fonts)
    ├── app.d.ts              # Global types (App.Platform)
    │
    ├── lib/
    │   ├── types.ts          # Shared types (CourseInfo, GenerateRequest, QuizQuestion, etc.)
    │   ├── utils.ts          # formatCourseCode, getLanguageName, escapeHtml, getTodayDate
    │   ├── i18n.ts           # Translation with 3-tier fallback chain
    │   ├── markdown.ts       # Frontmatter extraction, course parsing, markdown→HTML
    │   │
    │   ├── server/
    │   │   ├── env.ts        # Cross-runtime env access (process.env / platform.env)
    │   │   └── github.ts     # GitHub API client (list courses, fetch content, quiz, locales)
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
        ├── +layout.svelte          # App shell (Nav + slot + footer)
        ├── +page.svelte            # Main page (form + preview)
        ├── +page.server.ts         # Server load: list courses
        └── api/
            ├── courses/+server.ts   # GET: list available courses
            ├── languages/+server.ts # GET: list languages for a course
            └── generate/+server.ts  # POST: generate course/quiz HTML
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
   - **Cover page** — title, code, language, date, goal, objectives; optional instructor name/logo
   - **Table of contents** — numbered list with anchor links
   - **Body** — part headers + chapter headers + rendered markdown content
   - **Final page** — credits (teacher, contributors, proofreaders, license, GitHub source), review QR code, Discord contribute section with QR code, CTA messages, PlanB logo
   - **Page footer** — PlanB Academy logo + optional corporate logo (centered together) + page numbers (on every page except cover)
5. Wraps everything in a complete HTML document with print-optimized CSS
6. Client displays in a paginated iframe preview; "Save as PDF" extracts the paginated HTML and opens browser print dialog

### Quiz PDF Generation

Same flow, but instead of markdown parsing:
1. Fetches quiz questions from `courses/{code}/quizz/*/question.yml` + `{lang}.yml`
2. Optionally limits to N random questions (Fisher-Yates shuffle)
3. Shuffles answer choices (A/B/C/D) for each question
4. Generates quiz body + optional answer key with explanations

---

## API Reference

### `GET /api/courses`

Returns all available courses.

**Response:**
```json
[
  { "code": "btc101", "name": "", "level": "beginner", "topic": "bitcoin", "languages": [] }
]
```

> **Note:** Course names are resolved client-side (the browser fetches `en.md` frontmatter directly from GitHub). This avoids rate-limiting issues on the edge worker.

### `GET /api/languages?code={courseCode}`

Returns available languages for a specific course. Languages are loaded lazily per course.

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | yes | Course code (e.g. `btc101`) |

**Response:**
```json
["de", "en", "es", "fr", "it", "pt"]
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
  "answers": true,
  "presenterName": "Alice",
  "presenterLogo": "data:image/png;base64,..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | yes | Course code (e.g. `btc101`) |
| `lang` | string | yes | Language code (e.g. `en`, `fr`) |
| `mode` | `"course"` \| `"quiz"` | yes | Generation mode |
| `count` | number | no | Limit quiz to N random questions |
| `answers` | boolean | no | Include answer key (quiz only) |
| `presenterName` | string | no | Instructor name shown on cover page |
| `presenterLogo` | string | no | Instructor logo URL/data-URI (cover + page footer) |

**Response:**
```json
{
  "html": "<!DOCTYPE html>...",
  "title": "The Bitcoin Journey"
}
```

---

## Type Definitions

```typescript
// Course listing (languages loaded lazily via /api/languages)
interface CourseInfo {
  code: string;        // e.g. "btc101"
  name: string;        // Course display name
  level: string;       // beginner | intermediate | advanced | expert
  topic: string;       // e.g. "bitcoin", "lightning"
  languages: string[]; // Available language codes (populated lazily)
}

// API request / response
interface GenerateRequest {
  code: string;
  lang: string;
  mode: 'course' | 'quiz';
  count?: number;
  answers?: boolean;
  presenterName?: string;
  presenterLogo?: string;
}
interface GenerateResponse {
  html: string;
  title: string;
}

// Course credits (final page)
interface CourseCredits {
  teachers: string[];
  contributors: string[];
  proofreaders: string[];
  originalLanguage: string;
}

// Quiz structures
interface QuizQuestion {
  index: number;
  chapterId: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  explanation: string;
  difficulty: string;
}
interface ShuffledQuestion {
  index: number;
  question: string;
  choices: { letter: string; text: string }[]; // A, B, C, D
  correctLetter: string;
  explanation: string;
}

// i18n
type Translations = Record<string, unknown>;
```

---

## Components (Svelte 5 Runes)

### Nav.svelte
Sticky header with PlanB pill logo, app title ("Courses PDF Generator"), and "Enjoy teaching" tagline.

### GeneratorForm.svelte

**Props:** `courses: CourseInfo[]`, `loading: boolean`, `ongenerate: (params) => void`

**State ($state):**
- `filterLevel`, `filterTopic` — dropdown filters
- `selectedCode`, `selectedLang` — current selections
- `mode` — `'course'` | `'quiz'`
- `questionCount`, `includeAnswers` — quiz options
- `presenterName`, `presenterLogo` — optional instructor info
- `availableLanguages`, `loadingLangs` — dynamic language loading

**Derived ($derived):**
- `levels`, `topics` — unique filter values from courses
- `filteredCourses` — courses matching selected filters

**Effects ($effect):**
- On mount: fetches `en.md` from `raw.githubusercontent.com` for each course missing a name (client-side name resolution, avoids worker rate-limiting)
- When `selectedCode` changes → fetches `/api/languages?code=...` → auto-selects `'en'` or first available

**Form sections:**
1. Level & topic filter dropdowns
2. Course selector (shows filtered count)
3. Language selector (lazy-loaded per course)
4. Mode toggle (Course PDF / Quiz PDF)
5. Quiz options (count + answer key checkbox, shown when quiz mode)
6. Instructor section (optional name + logo file upload with data-URI preview)
7. Generate button (disabled until course + lang selected)

### PdfPreview.svelte

**Props:** `html: string`, `title: string`, `onsaved?: () => void`

**State ($state):**
- `viewMode` — `'single'` | `'grid'` (default: `'single'`)
- `iframeEl` — reference to the preview iframe
- `pageCount` — number of paginated pages (reported by iframe)

**Behavior:**
- Injects a pagination script into the iframe that splits content into A4-sized pages
- Pages are measured using DOM `scrollHeight` with margin collapse (794×1123 px per page, 57px top / 76px sides+bottom padding)
- Respects page break hints: `break-before` on chapter headers, final page, answer key; `break-after` on cover page, TOC page
- Part headers are pulled forward to stay with their first chapter when a page break occurs
- Waits for all images to load before paginating
- **Page footer**: PlanB Academy logo + optional corporate logo (centered together) + page number cloned into every page except the cover page
- **Single view**: pages stacked vertically with shadow and page numbers ("N / total")
- **Grid view**: pages shown as thumbnails (0.3274× scale); clicking a page switches to single view and scrolls to it
- View mode toggle buttons in the toolbar (single page / grid icons)
- Page count badge displayed next to the title
- Communication between parent and iframe via `postMessage` (`pdfPreviewReady`, `setViewMode`, `pdfViewModeChanged`)
- **"Save as PDF"**: extracts the already-paginated HTML from the preview iframe (including footer clones), strips scripts, injects print-specific CSS (`@page { margin: 0 }`, `.pdf-page { 210mm × 297mm; padding: 15mm 20mm 20mm 20mm }`), and opens the browser print dialog
- Overlay shows spinner, instructions, Plan B branding (screen-only, hidden in print)

### +page.svelte (Main Page)

**State:** `loading`, `error`, `generatedHtml`, `generatedTitle`

**Flow:** GeneratorForm submit → POST `/api/generate` → PdfPreview renders result

---

## Server-Side Pipeline

### github.ts — GitHub API Client

**Caching:** In-memory with 10-minute TTL for course list and per-course languages.

**Key functions:**
| Function | Purpose |
|---|---|
| `listCourses(platform)` | List all courses from BEC repo, fetch levels/topics in parallel (names resolved client-side) |
| `listCourseLanguages(code, platform)` | List available `.md` files for a course → extract language codes |
| `fetchCourseMarkdown(code, lang)` | Fetch raw markdown from `courses/{code}/{lang}.md` |
| `fetchCourseYml(code)` | Fetch course metadata from `courses/{code}/course.yml` |
| `fetchQuizQuestions(code, lang, platform)` | List `quizz/` subdirectories, fetch question + answers in parallel |
| `fetchLocaleFile(lang)` | Fetch BLMS translation file (`/locales/{lang}.json`) |
| `fetchProfessorNames(ids, platform)` | Resolve professor UUIDs to display names via GitHub GraphQL API (cached 10 min) |
| `fetchCourseLastCommit(code, lang, platform)` | Get last commit date for a course file |
| `getImageUrl(code, imgRef, lang)` | Build GitHub raw CDN URL for course images |

**Auth:** Optional `GITHUB_TOKEN` in env → Bearer token → 5000 req/hr (vs 60 unauthenticated).

### markdown.ts — Content Parser

| Function | Purpose |
|---|---|
| `extractFrontmatter(raw)` | Custom YAML parser (edge-compatible, replaces gray-matter) |
| `parseCourseMarkdown(rawContent)` | Extracts frontmatter, splits into parts/chapters, finds review section |
| `cleanContent(content)` | Strips `<partId>`, `<chapterId>`, UUIDs, stray URLs, excess newlines |
| `renderMarkdown(md, courseCode, lang)` | markdown-it render + rewrites local image paths to GitHub CDN |

### i18n.ts — Translation System

3-tier fallback: requested locale → English locale → hardcoded defaults.

Covers 40+ keys: `words.course`, `courses.details.curriculum`, `courses.exam.answersReview`, `courses.final.*` (endOfCourse, credits, teacher, contributors, proofreaders, license, source, contribute, etc.).

### templates/ — HTML Generators

| File | Generates |
|---|---|
| `styles.ts` | Print-optimized CSS (A4, 15mm top / 20mm side / 25mm bottom margins, orange accents), page footer HTML (PlanB logo + optional corporate logo centered together + page number) |
| `cover.ts` | Cover page (title, code, lang, date, goal, objectives, quiz count, optional instructor section) |
| `course.ts` | TOC with anchors, course body (parts + chapters), final page (credits, review QR, Discord QR, CTAs) |
| `quiz.ts` | Shuffled questions (A/B/C/D), answer key with explanations |

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
| Local filesystem content | GitHub raw URLs + Contents API |

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

The course list and per-course languages are cached in-memory for 10 minutes.

---

## Key Files for Future Work

| If you want to... | Edit... |
|---|---|
| Change PDF styling (margins, fonts, colors) | `src/lib/templates/styles.ts` |
| Modify cover page layout | `src/lib/templates/cover.ts` |
| Add/change HTML sections in course PDFs | `src/lib/templates/course.ts` |
| Add/change quiz formatting or answer key | `src/lib/templates/quiz.ts` |
| Change how markdown content is parsed | `src/lib/markdown.ts` |
| Add a new content source or change GitHub paths | `src/lib/server/github.ts` |
| Change UI appearance or form behavior | `src/lib/components/*.svelte` |
| Add new API endpoints | `src/routes/api/` |
| Add new languages to the UI language map | `src/lib/utils.ts` → `getLanguageName()` |
| Add authentication | `src/hooks.server.ts` (create it) |
| Support new quiz formats | `src/lib/templates/quiz.ts` + `src/lib/server/github.ts` |

---

## History

**v1.0.0** — CLI tool using Puppeteer, local filesystem, commander.js
**v2.0.0** — Web app (SvelteKit + OpenWorkers), GitHub API, browser print, lazy language loading
**v2.1.0** — Paginated PDF preview with single/grid view modes, proper @page margins
**v2.2.0** — Page footer (PlanB logo + page numbers), instructor/presenter section on cover, print pipeline uses pre-paginated HTML, tighter typography
**v2.3.0** — Client-side course name resolution (avoids worker rate-limiting), reduced top margin (15mm), improved print visibility for dividers and footer lines
**v2.3.1** — Footer logos centered together (removed × separator), no footer on cover page
**v2.4.0** — Redesigned final page with credits (teacher, contributors, proofreaders via GraphQL), review QR, Discord contribute QR, GitHub source link, CTAs; PlanB pill logo in Nav/print; UI text refresh

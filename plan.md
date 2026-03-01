# Plan: Modular PDF Generation System (v3.0)

## Goal

Replace the current 2-mode system (`course` | `quiz` + answers checkbox) with a
modular "pick what you want to extract" system. Each PDF type is a single card
the user selects after choosing a course and language.

---

## PDF Types

| # | Type               | Description                                              | Source              | Status     |
|---|--------------------|----------------------------------------------------------|---------------------|------------|
| 1 | **Course**         | Simplified — text + images only (current behavior)       | BEC `{lang}.md`     | Exists     |
| 2 | **Quiz**           | Randomized questions + answers always attached           | BEC `quizz/`        | Rework     |
| 3 | **Ready to Teach** | Teacher guide — objectives, tips, discussions            | Local test file (BEC long-term) | New |
| 4 | **Full Course**    | Complete — tutorials, video refs, resources, quizzes     | BEC `{lang}.md`     | Future     |

### Quiz Design

Quizzes are **randomized** (shuffled answer order, random subset when count is set).
This means a quiz PDF cannot be regenerated to produce matching answers separately.
Therefore:

- **Answers are ALWAYS attached** to the quiz PDF (appended after all questions)
- Remove the current "Include answers" checkbox entirely
- The "question count" option stays (user can pick a subset or all)
- No separate "Quiz Answers" PDF type

### Best Practices (to add to UI or docs)

- Quizzes are randomized — each generation produces a unique sheet
- Answers are always included at the end of the PDF
- **To give to students**: print only the question pages, skip the answer pages
- **To keep an answer key**: keep the full PDF or print only the last pages
- You cannot regenerate the same quiz — if you need both, use the single PDF

---

## Phase 1 — Restructure Modes + UI Redesign

### 1.1 Type System Changes

**File: `src/lib/types.ts`**

```typescript
// Replace:  mode: 'course' | 'quiz'
// With:
type PdfType = 'course' | 'course-full' | 'quiz' | 'teacher-guide';

interface GenerateRequest {
  code: string;
  lang: string;
  type: PdfType;              // renamed from "mode"
  count?: number;             // quiz only: number of questions (empty = all)
  presenterName?: string;
  presenterLogo?: string;
}
// Removed: answers?: boolean (answers always included now)
```

### 1.2 UI Redesign

**File: `src/lib/components/GeneratorForm.svelte`**

Current flow:
```
[Level filter] [Topic filter]
[Course dropdown]
[Language dropdown]
(o) Course PDF  (o) Quiz PDF     <- radio buttons
  |-- [ ] Include answers        <- checkbox
[Instructor section]
[Generate]
```

New flow:
```
[Level filter] [Topic filter]
[Course dropdown]
[Language dropdown]

-- What do you want to generate? --

+---------------+ +---------------+ +---------------+
|   Course      | |   Quiz        | | Ready to      |
|               | |               | |   Teach       |
| Text + images | | Randomized    | | Teacher guide |
| only          | | questions +   | |               |
|               | | answers       | | BETA          |
+---------------+ +---------------+ +---------------+

+---------------+
| Full Course   |
|               |
| Coming soon   |
|               |
+---------------+

[Quiz options: question count — only shown if Quiz is selected]

[Instructor section]
[Generate]
```

- Cards are **single-select** (one PDF at a time)
- Selecting "Quiz" shows the question count input below the cards
- "Ready to Teach" is enabled but shows a **BETA** badge
  - Works locally using the test file in `ready to teach/`
  - On deployed version, shows "Coming soon" / disabled
- "Full Course" shows **Coming soon** badge, disabled

### 1.3 API Changes

**File: `src/routes/api/generate/+server.ts`**

- Rename `mode` -> `type` in request parsing
- Routing:
  - `course` -> existing `generateCourseHtml()` (no change)
  - `quiz` -> `generateQuizHtml()` with answers ALWAYS included
  - `teacher-guide` -> new handler (Phase 2)
  - `course-full` -> return 501 for now
- Remove the `answers` boolean from request handling

### 1.4 Quiz Template Changes

**File: `src/lib/templates/quiz.ts`**

- Remove the conditional around answer key — always generate it
- Keep `generateQuizBodyHtml()` and `generateAnswerKeyHtml()` as separate
  functions but always call both

### 1.5 Files to Change (Phase 1)

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `PdfType`, update `GenerateRequest`, remove `answers` field |
| `src/lib/components/GeneratorForm.svelte` | Card picker UI, remove answers checkbox, quiz count option |
| `src/routes/api/generate/+server.ts` | Route by `type`, always include quiz answers |
| `src/lib/templates/quiz.ts` | Always attach answer key |
| `src/routes/+page.svelte` | Pass new `type` instead of `mode` to API call |

---

## Phase 2 — Ready to Teach

### 2.1 Content Source

- **Long-term**: BEC repo (exact path TBD, e.g. `courses/{code}/teacher-guide/{lang}.md`)
- **For now**: Local test file at `ready to teach/btc102-en-test.md`
- The API will serve the local file for development/testing
- On deployed version, the card shows "Coming soon" unless the BEC path exists

### 2.2 Parser

**File: `src/lib/markdown.ts`**

The teacher guide markdown uses the same `+++` separator and `# Part` / `## Chapter`
structure, but chapters contain `###` subsections instead of `<partId>`/`<chapterId>`:

- `### Learning Objectives`
- `### Key Concepts`
- `### Teaching Tips`
- `### Discussion Questions`
- `### Assignment Ideas`
- `### Quiz Focus`

New `parseTeacherGuideMarkdown()` function:
1. Extract frontmatter (same as courses)
2. Split on `+++`
3. Parse `# Part` / `## Chapter` without requiring XML tags
4. Within each chapter, extract `###` subsections by title into structured data

### 2.3 Template

**New file: `src/lib/templates/teacher-guide.ts`**

- Cover page (reuse `generateCoverHtml` with a "Teacher Guide" badge)
- Table of contents (reuse `generateTocHtml` with time estimates)
- Body: each chapter rendered with styled callout boxes per subsection:
  - Learning Objectives -> bordered box with checklist styling
  - Key Concepts -> highlighted box
  - Teaching Tips -> callout/aside box
  - Discussion Questions -> numbered list with distinct styling
  - Assignment Ideas -> bulleted list with distinct styling
  - Quiz Focus -> small info box
- Final page (reuse `generateFinalPageHtml`)

### 2.4 Files to Change (Phase 2)

| File | Change |
|------|--------|
| `src/lib/markdown.ts` | Add `parseTeacherGuideMarkdown()` |
| `src/lib/templates/teacher-guide.ts` | **New file** — teacher guide template |
| `src/lib/server/github.ts` | Add `fetchTeacherGuideMarkdown()` (local fallback for now) |
| `src/routes/api/generate/+server.ts` | Route `teacher-guide` type to new template |
| `src/lib/components/GeneratorForm.svelte` | Enable the teacher guide card (BETA badge) |
| `src/lib/types.ts` | Add teacher guide parsed types |

---

## Phase 3 — Full Course (Future, Out of Scope)

- Modify parser to have a "full" mode (keep YouTube refs, URLs, resource sections)
- Render YouTube embeds as styled link cards with thumbnails
- Map quiz questions to chapters via `chapterId` and embed per-chapter quizzes
- New template variant or flag in existing course template

---

## Out of Scope

- **Bundle generation** (multi-PDF download) — not planned
- **Server-side PDF rendering** (Puppeteer) — breaks edge compatibility
- **Phase 3 (Full Course)** — future work
- **Separate Quiz Answers PDF** — answers always attached to quiz

---

## Implementation Order

1. Phase 1.1 — Type system (`types.ts`)
2. Phase 1.2 — UI card picker (`GeneratorForm.svelte`)
3. Phase 1.3 — API routing (`+server.ts`)
4. Phase 1.4 — Quiz always-attach-answers (`quiz.ts`)
5. Phase 1.5 — Wire everything, test
6. Phase 2.1 — Teacher guide parser (`markdown.ts`)
7. Phase 2.2 — Teacher guide template (new file)
8. Phase 2.3 — Fetch logic + local fallback (`github.ts`)
9. Phase 2.4 — Enable in UI with BETA badge, test

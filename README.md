# Content to PDF

Generate print-ready PDFs from [Plan B Network](https://planb.network) courses and quizzes — directly in the browser.

**Live:** [content-to-pdf.workers.rocks](https://content-to-pdf.workers.rocks)

## Features

- **Course** — Text and images only, clean print layout
- **Full Course** — Tutorials, resources, and QR codes linking to external content
- **Quiz** — Randomized multiple-choice questions with answer key
- **Teacher Guide** — Ready to Teach companion (BETA)
- **48+ courses** across **30+ languages**
- Cover page, table of contents, page numbers, and final page with credits
- No Puppeteer — uses browser `window.print()` with print-optimized CSS

## Stack

- [SvelteKit 2](https://svelte.dev/) + [Svelte 5](https://svelte.dev/docs/svelte/overview) (runes)
- [Tailwind CSS v4](https://tailwindcss.com/)
- TypeScript
- Deployed on [OpenWorkers](https://openworkers.com/) (Cloudflare Workers edge)

## How It Works

All content is fetched at runtime from GitHub — no local repos needed:

- **Courses & quizzes** from [bitcoin-educational-content](https://github.com/PlanB-Network/bitcoin-educational-content) (`dev` branch)
- **i18n labels** from [bitcoin-learning-management-system](https://github.com/PlanB-Network/bitcoin-learning-management-system) (`main` branch)
- **Tutorial metadata** from the [Plan B Network API](https://planb.network)

Select a course, language, and PDF type in the UI, preview the result, then print/save as PDF.

## Development

```bash
git clone https://github.com/PlanB-Network/content-to-pdf.git
cd content-to-pdf
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173).

## Deploy

```bash
# Production
npm run deploy

# Staging
npm run deploy:dev
```

## Project Structure

```
src/
├── lib/
│   ├── components/       # Svelte UI components
│   ├── server/
│   │   └── github.ts     # GitHub content fetching + caching
│   ├── templates/
│   │   ├── cover.ts      # Cover page HTML
│   │   ├── course.ts     # TOC, course body, final page
│   │   ├── quiz.ts       # Quiz body + answer key
│   │   └── styles.ts     # Print CSS + page footer
│   ├── markdown.ts       # Markdown parsing + resource cards
│   ├── types.ts          # TypeScript types
│   └── i18n.ts           # Locale loading with fallback
└── routes/
    ├── +page.svelte      # Main UI
    ├── best-practices/   # Print best practices page
    └── api/
        ├── courses/      # GET — list all courses
        ├── languages/    # GET — languages for a course
        └── generate/     # POST — generate HTML document
```

## License

MIT

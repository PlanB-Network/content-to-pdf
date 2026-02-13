# Content to PDF

TypeScript CLI tool that generates print-ready PDFs from [Bitcoin Educational Content](https://github.com/PlanB-Network/bitcoin-educational-content) courses and quizzes.

Supports **48+ courses** across **30+ languages** with platform-matching layout, i18n labels from [BLMS](https://github.com/PlanB-Network/bitcoin-learning-management-system) locales, and embedded images.

## Features

- **Course PDFs** — Cover page, table of contents, full chapter content with embedded images, final page with QR code linking to the course review
- **Quiz PDFs** — Shuffled multiple-choice questions (A/B/C/D) with optional answer key and explanations
- **Multi-language** — Uses BLMS locale translations with fallback chain (requested lang -> en -> hardcoded)
- **Platform-matching design** — Plan B Network orange accent, proper typography, print-optimized layout
- **Persistent footer** — Version hash + date on every page with PBN logo

## Prerequisites

- Node.js >= 18
- Local clone of [bitcoin-educational-content](https://github.com/PlanB-Network/bitcoin-educational-content)
- Local clone of [bitcoin-learning-management-system](https://github.com/PlanB-Network/bitcoin-learning-management-system) (for i18n labels)

## Setup

```bash
git clone https://github.com/PlanB-Network/content-to-pdf.git
cd content-to-pdf
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` to point to your local repos:

```env
BEC_PATH=../bitcoin-educational-content
BLMS_LOCALES_PATH=../bitcoin-learning-management-system/apps/academy/public/locales
```

## Usage

### Course PDF

```bash
# English
npx tsx src/cli.ts course --code btc101 --lang en

# French
npx tsx src/cli.ts course --code btc101 --lang fr
```

### Quiz PDF

```bash
# Full quiz with answer key
npx tsx src/cli.ts quiz --code btc101 --lang en --answers

# Random 20-question exam (no answers)
npx tsx src/cli.ts quiz --code btc101 --lang en --count 20

# Random 20-question exam with answer key
npx tsx src/cli.ts quiz --code btc101 --lang en --count 20 --answers
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--code <code>` | Course code (e.g. `btc101`, `min201`) | Yes |
| `--lang <lang>` | Language code (e.g. `en`, `fr`, `es`) | Yes |
| `--count <n>` | Number of random questions (quiz only) | No |
| `--answers` | Include answer key (quiz only) | No |
| `--output <path>` | Custom output directory | No |
| `--bec-path <path>` | Override BEC repo path | No |
| `--blms-path <path>` | Override BLMS locales path | No |

Output PDFs are saved to `output/` by default.

## Project Structure

```
src/
├── cli.ts              # CLI entry point (commander)
├── config.ts           # Path resolution from .env / CLI args
├── course.ts           # Course PDF pipeline
├── quiz.ts             # Quiz PDF pipeline
├── markdown.ts         # Markdown parsing + content cleaning
├── pdf.ts              # HTML-to-PDF via Puppeteer
├── i18n.ts             # BLMS locale loading with fallback
├── utils.ts            # Image embedding, git hash, helpers
└── templates/
    ├── cover.ts        # Cover page HTML
    ├── course.ts       # TOC, course body, final page HTML
    ├── quiz.ts         # Quiz body + answer key HTML
    └── styles.ts       # Shared CSS (platform-matching)
```

## License

MIT

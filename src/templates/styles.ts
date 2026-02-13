export const ORANGE = "#FF5C00";

export function getSharedCss(): string {
  return `
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.65;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: white;
      font-size: 11pt;
    }

    /* ============ Cover page ============ */
    .cover-page {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding: 40px 20px 30px 20px;
    }
    .cover-top { }
    .cover-title {
      font-size: 32pt;
      font-weight: 800;
      color: #1a1a1a;
      margin: 0 0 8px 0;
      line-height: 1.15;
    }
    .cover-code {
      font-size: 16pt;
      color: #666;
      margin: 0 0 6px 0;
      letter-spacing: 1px;
    }
    .cover-subtitle {
      font-size: 18pt;
      color: ${ORANGE};
      font-weight: 600;
      margin: 0 0 6px 0;
    }
    .cover-meta {
      font-size: 11pt;
      color: #888;
      margin: 0 0 24px 0;
    }
    .cover-goal {
      border-left: 4px solid ${ORANGE};
      padding: 12px 16px;
      background: #fef7f2;
      margin: 16px 0;
      font-size: 11pt;
      color: #333;
    }
    .cover-goal-label {
      font-weight: 700;
      color: ${ORANGE};
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .cover-objectives {
      margin: 20px 0;
    }
    .cover-objectives-label {
      font-size: 12pt;
      font-weight: 700;
      color: ${ORANGE};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${ORANGE};
    }
    .cover-objectives-title {
      font-weight: 600;
      margin: 8px 0;
      font-size: 10pt;
    }


    /* ============ Table of Contents ============ */
    .toc-page { page-break-after: always; }
    .toc-heading {
      font-size: 14pt;
      font-weight: 700;
      color: ${ORANGE};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${ORANGE};
    }
    .toc-part {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #333;
      margin: 16px 0 6px 0;
      padding: 4px 0;
    }
    .toc-chapter {
      font-size: 10pt;
      color: #555;
      margin: 4px 0 4px 20px;
    }
    .toc-chapter a {
      color: #555;
      text-decoration: none;
    }
    .toc-chapter a:hover { color: ${ORANGE}; }

    /* ============ Part headers ============ */
    .part-header {
      page-break-before: always;
      margin-top: 60px;
      margin-bottom: 10px;
    }
    .part-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${ORANGE};
      font-weight: 700;
      margin-bottom: 4px;
    }
    .part-title {
      font-size: 22pt;
      font-weight: 800;
      color: #1a1a1a;
      text-transform: uppercase;
      padding-bottom: 10px;
      border-bottom: 3px solid ${ORANGE};
      margin: 0;
    }

    /* ============ Chapter headers ============ */
    .chapter-header {
      page-break-before: always;
      margin-top: 40px;
      margin-bottom: 20px;
      page-break-after: avoid;
    }
    .chapter-part-name {
      font-size: 9pt;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .chapter-number {
      font-size: 10pt;
      color: ${ORANGE};
      font-weight: 600;
      margin-bottom: 6px;
    }
    .chapter-title {
      font-size: 24pt;
      font-weight: 800;
      color: #1a1a1a;
      margin: 0;
      line-height: 1.2;
    }

    /* ============ Content ============ */
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    h3 {
      font-size: 13pt;
      font-weight: 700;
      color: #2c3e50;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 11pt;
      font-weight: 700;
      color: #34495e;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    p {
      margin: 10px 0;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    a { color: ${ORANGE}; text-decoration: none; }
    strong { font-weight: 700; }

    img {
      max-width: 80%;
      max-height: 450px;
      height: auto;
      display: block;
      margin: 16px auto;
      page-break-inside: avoid;
    }
    blockquote {
      border-left: 4px solid ${ORANGE};
      padding: 10px 16px;
      margin: 16px 0;
      background: #fef7f2;
      color: #444;
      font-style: italic;
      page-break-inside: avoid;
    }
    blockquote p { margin: 4px 0; }
    code {
      background: #f4f4f4;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 9.5pt;
    }
    pre {
      background: #f4f4f4;
      padding: 12px 16px;
      border-radius: 5px;
      overflow-x: auto;
      page-break-inside: avoid;
      font-size: 9pt;
      line-height: 1.5;
    }
    pre code { background: none; padding: 0; }
    ul, ol { margin: 10px 0; padding-left: 24px; }
    li { margin: 4px 0; }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      page-break-inside: avoid;
      font-size: 9.5pt;
    }
    thead { background: #f2f2f2; }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th { font-weight: 700; background: #f2f2f2; }
    tr:nth-child(even) { background: #fafafa; }

    /* ============ Quiz styling ============ */
    .quiz-header-box {
      background: ${ORANGE};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 14pt;
      font-weight: 700;
    }
    .question-block {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .question-number {
      font-weight: 700;
      color: ${ORANGE};
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .question-text {
      font-weight: 600;
      font-size: 11pt;
      margin-bottom: 10px;
      color: #1a1a1a;
    }
    .choice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 6px 0;
      padding: 6px 10px;
      border-radius: 4px;
    }
    .choice-letter {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      min-width: 22px;
      border-radius: 50%;
      background: #f0f0f0;
      font-weight: 700;
      font-size: 9pt;
      color: #555;
    }
    .choice-text { font-size: 10pt; color: #333; padding-top: 2px; }

    /* ============ Answer key ============ */
    .answer-key { page-break-before: always; }
    .answer-key-title {
      font-size: 16pt;
      font-weight: 700;
      color: ${ORANGE};
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${ORANGE};
    }
    .answer-item {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
      page-break-inside: avoid;
    }
    .answer-item-header {
      font-weight: 700;
      color: #333;
      font-size: 10pt;
    }
    .answer-correct {
      color: ${ORANGE};
      font-weight: 700;
    }
    .answer-explanation {
      font-size: 9.5pt;
      color: #666;
      margin-top: 4px;
    }

    /* ============ Final page ============ */
    .final-page {
      page-break-before: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px 20px 30px 20px;
    }
    .final-page-content {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .final-page-content h2 {
      color: #1a1a1a;
      font-size: 18pt;
      font-weight: 700;
      margin-bottom: 30px;
      max-width: 400px;
    }
    .final-page-content img {
      max-width: 200px;
      margin: 0 auto 20px auto;
    }
    .final-url {
      color: #666;
      font-size: 9pt;
      word-break: break-all;
    }

    /* ============ Objectives ============ */
    .objectives-list {
      list-style: none;
      padding: 0;
    }
    .objectives-list li {
      padding: 4px 0 4px 24px;
      position: relative;
      font-size: 10pt;
    }
    .objectives-list li::before {
      content: "\\2713";
      position: absolute;
      left: 0;
      color: ${ORANGE};
      font-weight: 700;
    }
  `;
}

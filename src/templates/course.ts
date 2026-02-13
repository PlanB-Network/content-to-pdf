import type { Part } from "../markdown.js";
import { renderMarkdown } from "../markdown.js";
import { t } from "../i18n.js";
import QRCode from "qrcode";

export function generateTocHtml(
  parts: Part[],
  lang: string,
  blmsPath: string
): string {
  const curriculumLabel = t(lang, "courses.details.curriculum", blmsPath);

  let tocEntries = "";
  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    tocEntries += `<div class="toc-part">${escapeHtml(part.title.toUpperCase())}</div>\n`;
    for (let ci = 0; ci < part.chapters.length; ci++) {
      const ch = part.chapters[ci];
      const num = `${pi + 1}.${ci + 1}`;
      const anchor = `chapter-${pi}-${ci}`;
      tocEntries += `<div class="toc-chapter"><a href="#${anchor}">${num} - ${escapeHtml(ch.title)}</a></div>\n`;
    }
  }

  return `
    <div class="toc-page">
      <div class="toc-heading">${escapeHtml(curriculumLabel)}</div>
      ${tocEntries}
    </div>
  `;
}

export function generateCourseBodyHtml(
  parts: Part[],
  courseDir: string,
  lang: string,
  blmsPath: string
): string {
  let html = "";

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];

    // Part header
    html += `
      <div class="part-header">
        <div class="part-label">Part ${pi + 1}</div>
        <h1 class="part-title">${escapeHtml(part.title)}</h1>
      </div>
    `;

    for (let ci = 0; ci < part.chapters.length; ci++) {
      const ch = part.chapters[ci];
      const num = `${pi + 1}.${ci + 1}`;
      const anchor = `chapter-${pi}-${ci}`;

      html += `
        <div class="chapter-header" id="${anchor}">
          <div class="chapter-part-name">${escapeHtml(part.title)}</div>
          <div class="chapter-number">${t(lang, "words.chapter", blmsPath)} ${num}</div>
          <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
        </div>
      `;

      // Render chapter markdown content
      const rendered = renderMarkdown(ch.content, courseDir, lang);
      html += `<div class="chapter-content">${rendered}</div>\n`;
    }
  }

  return html;
}

export async function generateFinalPageHtml(
  courseId: string,
  reviewChapterId: string | null,
  lang: string
): Promise<string> {
  const reviewUrl = reviewChapterId
    ? `https://planb.academy/${lang}/courses/${courseId}/${reviewChapterId}`
    : `https://planb.academy/${lang}/courses/${courseId}`;

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#FFFFFF" },
    });
  } catch {
    console.warn("  Warning: could not generate QR code");
  }

  return `
    <div class="final-page">
      <div class="final-page-content">
        <h2>If you enjoyed this course, please leave a review on the platform</h2>
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code">` : ""}
        <p class="final-url">${escapeHtml(reviewUrl)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

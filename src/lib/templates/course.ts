import type { Part } from '../markdown.js';
import { renderMarkdown } from '../markdown.js';
import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import type { Translations } from '../types.js';

export function generateTocHtml(
  parts: Part[],
  locale: Translations | null,
  enLocale: Translations | null
): string {
  const curriculumLabel = t(locale, enLocale, 'courses.details.curriculum');

  let tocEntries = '';
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
  courseCode: string,
  lang: string,
  locale: Translations | null,
  enLocale: Translations | null
): string {
  let html = '';

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];

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
          <div class="chapter-number">${t(locale, enLocale, 'words.chapter')} ${num}</div>
          <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
        </div>
      `;

      const rendered = renderMarkdown(ch.content, courseCode, lang);
      html += `<div class="chapter-content">${rendered}</div>\n`;
    }
  }

  return html;
}

export function generateFinalPageHtml(
  courseId: string,
  reviewChapterId: string | null,
  lang: string
): string {
  const reviewUrl = reviewChapterId
    ? `https://planb.academy/${lang}/courses/${courseId}/${reviewChapterId}`
    : `https://planb.academy/${lang}/courses/${courseId}`;

  // Use external QR code API (edge-compatible, no Node.js fs dependency)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewUrl)}`;

  return `
    <div class="final-page">
      <div class="final-page-content">
        <h2>If you enjoyed this course, please leave a review on the platform</h2>
        <img src="${qrApiUrl}" alt="QR Code" width="200" height="200">
        <p class="final-url">${escapeHtml(reviewUrl)}</p>
      </div>
    </div>
  `;
}

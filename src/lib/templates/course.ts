import type { Part } from '../markdown.js';
import { renderMarkdown } from '../markdown.js';
import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import type { CourseCredits, TutorialMeta, CourseMeta, Translations } from '../types.js';
import { PLANB_LOGO_SVG } from './styles.js';

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
    <div class="toc-heading">${escapeHtml(curriculumLabel)}</div>
    ${tocEntries}
    <div class="toc-end"></div>
  `;
}

export function generateCourseBodyHtml(
  parts: Part[],
  courseCode: string,
  lang: string,
  locale: Translations | null,
  enLocale: Translations | null,
  fullMode = false,
  tutorialMetaMap?: Map<string, TutorialMeta>,
  courseMetaMap?: Map<string, CourseMeta>
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

      html += renderMarkdown(ch.content, courseCode, lang, fullMode, tutorialMetaMap, courseMetaMap) + '\n';
    }
  }

  return html;
}

export function generateFinalPageHtml(
  courseCode: string,
  courseId: string,
  courseName: string,
  reviewChapterId: string | null,
  lang: string,
  credits: CourseCredits,
  locale: Translations | null,
  enLocale: Translations | null
): string {
  const reviewUrl = reviewChapterId
    ? `https://planb.academy/${lang}/courses/${courseId}/${reviewChapterId}`
    : `https://planb.academy/${lang}/courses/${courseId}`;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewUrl)}`;

  const githubUrl = `https://github.com/PlanB-Network/bitcoin-educational-content/tree/dev/courses/${encodeURIComponent(courseCode)}`;
  const discordUrl = 'https://discord.gg/vqfba7NTKk';
  const discordQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(discordUrl)}`;

  // Build credit rows (only show rows that have data)
  let creditsHtml = '';

  if (credits.teachers.length > 0) {
    creditsHtml += `
      <div class="final-credit-row">
        <span class="final-credit-label">${escapeHtml(t(locale, enLocale, 'courses.final.teacher'))}</span>
        <span class="final-credit-value">${escapeHtml(credits.teachers.join(', '))}</span>
      </div>`;
  }

  if (credits.contributors.length > 0) {
    creditsHtml += `
      <div class="final-credit-row">
        <span class="final-credit-label">${escapeHtml(t(locale, enLocale, 'courses.final.contributors'))}</span>
        <span class="final-credit-value">${escapeHtml(credits.contributors.join(', '))}</span>
      </div>`;
  }

  if (credits.proofreaders.length > 0) {
    creditsHtml += `
      <div class="final-credit-row">
        <span class="final-credit-label">${escapeHtml(t(locale, enLocale, 'courses.final.proofreaders'))}</span>
        <span class="final-credit-value">${escapeHtml(credits.proofreaders.join(', '))}</span>
      </div>`;
  }

  creditsHtml += `
    <div class="final-credit-row">
      <span class="final-credit-label">${escapeHtml(t(locale, enLocale, 'courses.final.license'))}</span>
      <span class="final-credit-value">CC BY-SA 4.0</span>
    </div>
    <div class="final-credit-row">
      <span class="final-credit-label">${escapeHtml(t(locale, enLocale, 'courses.final.source'))}</span>
      <span class="final-credit-value"><a href="${githubUrl}">${escapeHtml(githubUrl)}</a></span>
    </div>`;

  return `
    <div class="final-page">
      <div class="final-header">
        <div class="final-header-rule"></div>
        <h2>${escapeHtml(t(locale, enLocale, 'courses.final.endOfCourse'))} ${escapeHtml(courseName)}</h2>
        <p>${escapeHtml(t(locale, enLocale, 'courses.final.thankYouCompleting'))}</p>
      </div>

      <div class="final-review">
        <div class="final-review-text">
          <p>${escapeHtml(t(locale, enLocale, 'courses.final.leaveReview'))}</p>
        </div>
        <div class="final-review-qr">
          <a href="${escapeHtml(reviewUrl)}"><img src="${qrApiUrl}" alt="QR Code" width="150" height="150"></a>
          <a class="resource-card-url" href="${escapeHtml(reviewUrl)}">See more →</a>
        </div>
      </div>

      <div class="final-credits">
        <div class="final-credits-heading">${escapeHtml(t(locale, enLocale, 'courses.final.credits'))}</div>
        ${creditsHtml}
      </div>

      <div class="final-contribute">
        <div class="final-contribute-text">
          <p>${escapeHtml(t(locale, enLocale, 'courses.final.contribute'))}</p>
          <p class="final-contribute-link"><a href="${discordUrl}">${escapeHtml(discordUrl)}</a></p>
        </div>
        <div class="final-contribute-qr">
          <img src="${discordQrUrl}" alt="Discord QR" width="80" height="80">
        </div>
      </div>

      <div class="final-cta">
        <p>${escapeHtml(t(locale, enLocale, 'courses.final.discoverMore'))} <strong>planb.academy</strong></p>
        <p>${escapeHtml(t(locale, enLocale, 'courses.final.thankYouDedication'))}</p>
        <p class="final-cta-instructor">${escapeHtml(t(locale, enLocale, 'courses.final.thankYouInstructor'))}</p>
      </div>

      <div class="final-logo">
        ${PLANB_LOGO_SVG}
      </div>
    </div>
  `;
}

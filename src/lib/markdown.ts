import { parse as parseYaml } from 'yaml';
import MarkdownIt from 'markdown-it';
import { getImageUrl } from './server/github.js';
import { escapeHtml } from './utils.js';
import type { TutorialMeta, CourseMeta } from './types.js';

export interface CourseFrontmatter {
  name: string;
  goal: string;
  objectives: string[];
}

export interface Chapter {
  title: string;
  chapterId: string;
  content: string;
}

export interface Part {
  title: string;
  partId: string;
  chapters: Chapter[];
}

export interface ParsedCourse {
  frontmatter: CourseFrontmatter;
  intro: string;
  parts: Part[];
  reviewChapterId: string | null;
}

/**
 * Extract YAML frontmatter from markdown (replaces gray-matter for edge compatibility).
 */
function extractFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }
  try {
    const data = parseYaml(match[1]) as Record<string, unknown>;
    return { data: data || {}, content: match[2] };
  } catch {
    return { data: {}, content: raw };
  }
}

/**
 * Parse a teacher guide markdown file that uses plain # Part / ## Chapter headings
 * (no <partId> / <chapterId> tags). Returns the same ParsedCourse structure.
 */
export function parseTeacherGuideMarkdown(rawContent: string): ParsedCourse {
  const { data, content } = extractFrontmatter(rawContent);
  const frontmatter: CourseFrontmatter = {
    name: (data.name as string) || '',
    goal: (data.goal as string) || '',
    objectives: (data.objectives as string[]) || []
  };

  // Split at +++ separator for intro
  const plusSepIdx = content.indexOf('\n+++\n');
  let intro = '';
  let mainContent = content;

  if (plusSepIdx !== -1) {
    intro = content.substring(0, plusSepIdx).trim();
    mainContent = content.substring(plusSepIdx + 5).trim();
  }

  // Parse parts by # headings and chapters by ## headings
  const parts: Part[] = [];
  const partRegex = /^# (.+)$/gm;
  const partMatches = [...mainContent.matchAll(partRegex)];

  for (let i = 0; i < partMatches.length; i++) {
    const match = partMatches[i];
    const partTitle = match[1].trim();

    const partStart = match.index! + match[0].length;
    const partEnd =
      i + 1 < partMatches.length ? partMatches[i + 1].index! : mainContent.length;
    const partContent = mainContent.substring(partStart, partEnd).trim();

    const chapterRegex = /^## (.+)$/gm;
    const chapterMatches = [...partContent.matchAll(chapterRegex)];
    const chapters: Chapter[] = [];

    for (let j = 0; j < chapterMatches.length; j++) {
      const cm = chapterMatches[j];
      const chapterTitle = cm[1].trim();

      const chStart = cm.index! + cm[0].length;
      const chEnd =
        j + 1 < chapterMatches.length ? chapterMatches[j + 1].index! : partContent.length;
      const chapterContent = partContent.substring(chStart, chEnd).trim();

      chapters.push({
        title: chapterTitle,
        chapterId: `tg-${i}-${j}`,
        content: chapterContent
      });
    }

    if (chapters.length > 0) {
      parts.push({ title: partTitle, partId: `tg-part-${i}`, chapters });
    }
  }

  return { frontmatter, intro, parts, reviewChapterId: null };
}

export function parseCourseMarkdown(rawContent: string, fullMode = false): ParsedCourse {
  const { data, content } = extractFrontmatter(rawContent);
  const frontmatter: CourseFrontmatter = {
    name: (data.name as string) || '',
    goal: (data.goal as string) || '',
    objectives: (data.objectives as string[]) || []
  };

  // Split at +++ separator
  const plusSepIdx = content.indexOf('\n+++\n');
  let intro = '';
  let mainContent = content;

  if (plusSepIdx !== -1) {
    intro = content.substring(0, plusSepIdx).trim();
    mainContent = content.substring(plusSepIdx + 5).trim();
  }

  // Extract reviewChapterId before parsing structure
  let reviewChapterId: string | null = null;
  const reviewMatch = mainContent.match(
    /<chapterId>([^<]+)<\/chapterId>\s*\n\s*<isCourseReview>true<\/isCourseReview>/
  );
  if (reviewMatch) {
    reviewChapterId = reviewMatch[1].trim();
  }

  // Parse parts and chapters from mainContent
  const parts: Part[] = [];
  const partRegex = /^# (.+)\n+<partId>([^<]+)<\/partId>/gm;
  const partMatches = [...mainContent.matchAll(partRegex)];

  const SKIP_TITLES = new Set([
    'final section',
    'reviews & ratings',
    'final exam',
    'conclusion'
  ]);

  for (let i = 0; i < partMatches.length; i++) {
    const match = partMatches[i];
    const partTitle = match[1].trim();
    const partId = match[2].trim();

    if (SKIP_TITLES.has(partTitle.toLowerCase())) continue;

    const partStart = match.index! + match[0].length;
    const partEnd =
      i + 1 < partMatches.length ? partMatches[i + 1].index! : mainContent.length;
    const partContent = mainContent.substring(partStart, partEnd).trim();

    const chapterRegex = /^## (.+)\n+<chapterId>([^<]+)<\/chapterId>/gm;
    const chapterMatches = [...partContent.matchAll(chapterRegex)];
    const chapters: Chapter[] = [];

    for (let j = 0; j < chapterMatches.length; j++) {
      const cm = chapterMatches[j];
      const chapterTitle = cm[1].trim();
      const chapterId = cm[2].trim();

      if (SKIP_TITLES.has(chapterTitle.toLowerCase())) continue;

      const chStart = cm.index! + cm[0].length;
      const chEnd =
        j + 1 < chapterMatches.length ? chapterMatches[j + 1].index! : partContent.length;
      const chapterContent = partContent.substring(chStart, chEnd).trim();

      // Skip special sections (exam, review, conclusion) using language-independent XML tags
      if (
        /<isCourseReview>true<\/isCourseReview>/.test(chapterContent) ||
        /<isCourseExam>/.test(chapterContent) ||
        /<isCourseConclusion>/.test(chapterContent)
      ) {
        continue;
      }

      const cleaned = cleanContent(chapterContent, fullMode);
      if (!cleaned) continue; // Skip chapters with no content after cleaning

      chapters.push({
        title: chapterTitle,
        chapterId,
        content: cleaned
      });
    }

    if (chapters.length > 0) {
      parts.push({ title: partTitle, partId, chapters });
    }
  }

  return { frontmatter, intro: cleanContent(intro, fullMode), parts, reviewChapterId };
}

export function cleanContent(content: string, fullMode = false): string {
  let c = content;
  c = c.replace(/<partId>[^<]*<\/partId>/g, '');
  c = c.replace(/<chapterId>[^<]*<\/chapterId>/g, '');
  c = c.replace(/<isCourseReview>[^<]*<\/isCourseReview>/g, '');
  c = c.replace(/<isCourseExam>[^<]*<\/isCourseExam>/g, '');
  c = c.replace(/<isCourseConclusion>[^<]*<\/isCourseConclusion>/g, '');
  c = c.replace(/^\+\+\+\s*$/gm, '');
  // Strip :::video and other fenced directives (e.g. :::video id=...:::)
  c = c.replace(/^:::\w.*$/gm, '');
  // Standalone UUIDs and booleans are always noise
  c = c.replace(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*$/gm,
    ''
  );
  c = c.replace(/^\s*(true|false)\s*$/gm, '');
  if (!fullMode) {
    // Strip standalone URLs and YouTube embeds in simplified mode
    c = c.replace(/^https?:\/\/[^\s]+\s*$/gm, '');
    c = c.replace(/^!\[[^\]]*\]\(https?:\/\/(?:www\.)?(?:youtu\.be|youtube\.com)[^)]*\)\s*$/gm, '');
  }
  c = c.replace(/^---\s*\n.*?name:.*?\n---\s*$/gms, '');
  c = c.replace(/\n{3,}/g, '\n\n');
  return c.trim();
}

/**
 * Extract a YouTube video ID from a URL.
 */
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Prettify a PlanB Academy URL into a readable label and type.
 */
function prettifyPlanbUrl(url: string): { label: string; type: string } {
  const tutorialMatch = url.match(/planb\.academy\/tutorials\/([^/]+)\/(?:[^/]+\/)?([^?#]+)/);
  if (tutorialMatch) {
    const slug = tutorialMatch[2]
      .replace(/-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, '')
      .replace(/-/g, ' ');
    const label = slug.charAt(0).toUpperCase() + slug.slice(1);
    return { label, type: 'tutorial' };
  }

  const courseMatch = url.match(/planb\.academy\/courses\/([a-zA-Z0-9-]+)/);
  if (courseMatch) {
    return { label: courseMatch[1].toUpperCase(), type: 'course' };
  }

  const resourceMatch = url.match(/planb\.academy\/resources\/(books|movies|glossary)\/(.+)/);
  if (resourceMatch) {
    return { label: resourceMatch[1].charAt(0).toUpperCase() + resourceMatch[1].slice(1), type: 'resource' };
  }

  return { label: url.replace(/^https?:\/\//, '').split('/')[0], type: 'link' };
}

/**
 * Extract all unique tutorial URLs from markdown content.
 */
export function extractTutorialUrls(content: string): string[] {
  const urls = new Set<string>();
  const regex = /^(https?:\/\/[^\s]*planb\.academy\/tutorials\/[^\s]+)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    urls.add(m[1]);
  }
  return [...urls];
}

/**
 * Extract all unique course URLs from markdown content.
 */
export function extractCourseUrls(content: string): string[] {
  const urls = new Set<string>();
  const regex = /^(https?:\/\/[^\s]*planb\.academy\/courses\/[^\s]+)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    urls.add(m[1]);
  }
  return [...urls];
}

/**
 * Render an enriched course card with thumbnail, name, goal, QR and URL.
 */
function renderCourseCard(url: string, meta: CourseMeta): string {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  return `<div class="resource-card"><div class="resource-card-body"><img class="resource-card-thumb" src="${escapeHtml(meta.thumbnailUrl)}" alt="" /><div class="resource-card-info"><div class="resource-card-type">COURSE</div><div class="resource-card-title">${escapeHtml(meta.code.toUpperCase())} — ${escapeHtml(meta.name)}</div><div class="resource-card-desc">${escapeHtml(meta.goal)}</div></div></div><div class="resource-card-qr"><a href="${escapeHtml(url)}"><img src="${qrUrl}" alt="QR" width="70" height="70" /></a><a class="resource-card-url" href="${escapeHtml(url)}">See course →</a></div></div>`;
}

/**
 * Render an enriched tutorial card with logo, name, description, QR and URL.
 */
function renderTutorialCard(url: string, meta: TutorialMeta): string {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  const logoHtml = meta.logoUrl
    ? `<img class="tutorial-card-logo" src="${escapeHtml(meta.logoUrl)}" alt="" />`
    : '';

  return `<div class="tutorial-card"><div class="tutorial-card-body">${logoHtml}<div class="tutorial-card-info"><div class="tutorial-card-type">TUTORIAL</div><div class="tutorial-card-title">${escapeHtml(meta.name)}</div><div class="tutorial-card-desc">${escapeHtml(meta.description)}</div></div></div><div class="tutorial-card-right"><a href="${escapeHtml(url)}"><img src="${qrUrl}" alt="QR" width="60" height="60" /></a><a class="tutorial-card-url" href="${escapeHtml(url)}">See tutorial →</a></div></div>`;
}

/**
 * Render a standalone URL as a styled resource card with QR code.
 * If enrichment metadata is available, renders enriched tutorial/course cards.
 */
function renderResourceCard(
  url: string,
  altText?: string,
  tutorialMetaMap?: Map<string, TutorialMeta>,
  courseMetaMap?: Map<string, CourseMeta>
): string {
  // Enriched tutorial card when metadata is available
  if (tutorialMetaMap) {
    const meta = tutorialMetaMap.get(url);
    if (meta) return renderTutorialCard(url, meta);
  }

  // Enriched course card when metadata is available
  if (courseMetaMap) {
    const meta = courseMetaMap.get(url);
    if (meta) return renderCourseCard(url, meta);
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  const videoId = extractYouTubeId(url);

  let typeLabel: string;
  let title: string;
  let thumbnailHtml = '';

  if (videoId) {
    typeLabel = 'VIDEO';
    title = altText || 'Video';
    thumbnailHtml = `<img class="resource-card-thumb" src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="" />`;
  } else {
    const info = prettifyPlanbUrl(url);
    typeLabel = info.type.toUpperCase();
    title = info.label;
  }

  // Short link label based on type
  const linkLabel = videoId ? 'Watch video →' : 'See more →';

  return `<div class="resource-card"><div class="resource-card-body">${thumbnailHtml}<div class="resource-card-info"><div class="resource-card-type">${escapeHtml(typeLabel)}</div><div class="resource-card-title">${escapeHtml(title)}</div></div></div><div class="resource-card-qr"><a href="${escapeHtml(url)}"><img src="${qrUrl}" alt="QR" width="70" height="70" /></a><a class="resource-card-url" href="${escapeHtml(url)}">${linkLabel}</a></div></div>`;
}

/**
 * Render markdown to HTML, replacing local image references with GitHub raw URLs.
 * When enrichment maps are provided, matching URLs render as enriched cards.
 */
export function renderMarkdown(
  md: string,
  courseCode: string,
  lang: string,
  fullMode = false,
  tutorialMetaMap?: Map<string, TutorialMeta>,
  courseMetaMap?: Map<string, CourseMeta>
): string {
  const mdi = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  });

  let processed = md;

  if (fullMode) {
    // Convert YouTube embeds to resource cards (before markdown-it processes them).
    // Wrap in blank lines so markdown-it treats the <div> as an HTML block,
    // not inline HTML inside a <p> (which would create orphan text nodes).
    processed = processed.replace(
      /^!\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtu\.be|youtube\.com)[^)]*)\)\s*$/gm,
      (_match, alt: string, url: string) => '\n' + renderResourceCard(url, alt, tutorialMetaMap, courseMetaMap) + '\n'
    );

    // Convert standalone URLs to resource cards (same blank-line wrapping)
    processed = processed.replace(
      /^(https?:\/\/[^\s]+)\s*$/gm,
      (_match, url: string) => '\n' + renderResourceCard(url, undefined, tutorialMetaMap, courseMetaMap) + '\n'
    );
  }

  // Replace local image refs with GitHub raw URLs
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt: string, src: string) => {
      // Keep external URLs as-is
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return `![${alt}](${src})`;
      }
      const url = getImageUrl(courseCode, src, lang);
      return `![${alt}](${url})`;
    }
  );

  let html = mdi.render(processed);

  // Convert task-list items: [ ] → unchecked checkbox, [x] → checked checkbox
  html = html.replace(
    /<li>\s*\[( |x)\]\s*/gi,
    (_match, check: string) => {
      const checked = check.toLowerCase() === 'x' ? ' checked' : '';
      return `<li class="task-list-item"><input type="checkbox" disabled${checked}> `;
    }
  );

  // Wrap standalone image paragraphs in a div for reliable page-break avoidance
  html = html.replace(/<p>(\s*<img[^>]*\/?\s*>\s*)<\/p>/g, '<div class="img-wrap">$1</div>');

  return html;
}

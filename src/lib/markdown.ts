import { parse as parseYaml } from 'yaml';
import MarkdownIt from 'markdown-it';
import { getImageUrl } from './server/github.js';

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

export function parseCourseMarkdown(rawContent: string): ParsedCourse {
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

      chapters.push({
        title: chapterTitle,
        chapterId,
        content: cleanContent(chapterContent)
      });
    }

    if (chapters.length > 0) {
      parts.push({ title: partTitle, partId, chapters });
    }
  }

  return { frontmatter, intro: cleanContent(intro), parts, reviewChapterId };
}

export function cleanContent(content: string): string {
  let c = content;
  c = c.replace(/<partId>[^<]*<\/partId>/g, '');
  c = c.replace(/<chapterId>[^<]*<\/chapterId>/g, '');
  c = c.replace(/<isCourseReview>[^<]*<\/isCourseReview>/g, '');
  c = c.replace(/<isCourseExam>[^<]*<\/isCourseExam>/g, '');
  c = c.replace(/<isCourseConclusion>[^<]*<\/isCourseConclusion>/g, '');
  c = c.replace(/^\+\+\+\s*$/gm, '');
  c = c.replace(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*$/gm,
    ''
  );
  c = c.replace(/^\s*(true|false)\s*$/gm, '');
  c = c.replace(/^https?:\/\/[^\s]+\s*$/gm, '');
  c = c.replace(/^---\s*\n.*?name:.*?\n---\s*$/gms, '');
  c = c.replace(/\n{3,}/g, '\n\n');
  return c.trim();
}

/**
 * Render markdown to HTML, replacing local image references with GitHub raw URLs.
 */
export function renderMarkdown(md: string, courseCode: string, lang: string): string {
  const mdi = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  });

  // Replace local image refs with GitHub raw URLs
  const processed = md.replace(
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

  // Wrap standalone image paragraphs in a div for reliable page-break avoidance
  html = html.replace(/<p>(\s*<img[^>]*\/?\s*>\s*)<\/p>/g, '<div class="img-wrap">$1</div>');

  return html;
}

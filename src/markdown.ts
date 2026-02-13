import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import { resolve } from "path";
import { resolveImagePath, imageToBase64 } from "./utils.js";

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

export function parseCourseMarkdown(rawContent: string): ParsedCourse {
  // Extract frontmatter
  const { data, content } = matter(rawContent);
  const frontmatter: CourseFrontmatter = {
    name: data.name || "",
    goal: data.goal || "",
    objectives: data.objectives || [],
  };

  // Split at +++ separator
  const plusSepIdx = content.indexOf("\n+++\n");
  let intro = "";
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

  // Titles to skip (Final Section and its chapters)
  const SKIP_TITLES = new Set([
    "final section",
    "reviews & ratings",
    "final exam",
    "conclusion",
  ]);

  for (let i = 0; i < partMatches.length; i++) {
    const match = partMatches[i];
    const partTitle = match[1].trim();
    const partId = match[2].trim();

    // Skip the Final Section part entirely
    if (SKIP_TITLES.has(partTitle.toLowerCase())) continue;

    const partStart = match.index! + match[0].length;
    const partEnd =
      i + 1 < partMatches.length ? partMatches[i + 1].index! : mainContent.length;
    const partContent = mainContent.substring(partStart, partEnd).trim();

    // Parse chapters within this part
    const chapterRegex = /^## (.+)\n+<chapterId>([^<]+)<\/chapterId>/gm;
    const chapterMatches = [...partContent.matchAll(chapterRegex)];
    const chapters: Chapter[] = [];

    for (let j = 0; j < chapterMatches.length; j++) {
      const cm = chapterMatches[j];
      const chapterTitle = cm[1].trim();
      const chapterId = cm[2].trim();

      // Skip final section chapters
      if (SKIP_TITLES.has(chapterTitle.toLowerCase())) continue;

      const chStart = cm.index! + cm[0].length;
      const chEnd =
        j + 1 < chapterMatches.length
          ? chapterMatches[j + 1].index!
          : partContent.length;
      const chapterContent = partContent.substring(chStart, chEnd).trim();

      chapters.push({
        title: chapterTitle,
        chapterId,
        content: cleanContent(chapterContent),
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
  // Remove XML-like tags
  c = c.replace(/<partId>[^<]*<\/partId>/g, "");
  c = c.replace(/<chapterId>[^<]*<\/chapterId>/g, "");
  c = c.replace(/<isCourseReview>[^<]*<\/isCourseReview>/g, "");
  c = c.replace(/<isCourseExam>[^<]*<\/isCourseExam>/g, "");
  c = c.replace(/<isCourseConclusion>[^<]*<\/isCourseConclusion>/g, "");
  // Remove +++ separators
  c = c.replace(/^\+\+\+\s*$/gm, "");
  // Remove bare UUIDs on their own lines
  c = c.replace(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*$/gm,
    ""
  );
  // Remove standalone "true"/"false" lines
  c = c.replace(/^\s*(true|false)\s*$/gm, "");
  // Remove bare URLs on their own lines
  c = c.replace(/^https?:\/\/[^\s]+\s*$/gm, "");
  // Remove --- name: ... --- blocks (frontmatter remnants)
  c = c.replace(/^---\s*\n.*?name:.*?\n---\s*$/gms, "");
  // Clean excessive blank lines
  c = c.replace(/\n{3,}/g, "\n\n");
  return c.trim();
}

export function renderMarkdown(
  md: string,
  courseDir: string,
  lang: string
): string {
  const mdi = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Process images before rendering: replace markdown image refs with base64
  const processed = md.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt: string, src: string) => {
      // Skip external URLs that aren't actual images
      if (src.startsWith("http://") || src.startsWith("https://")) {
        return `![${alt}](${src})`;
      }
      const imgPath = resolveImagePath(src, courseDir, lang);
      if (imgPath) {
        const dataUrl = imageToBase64(imgPath);
        if (dataUrl) {
          return `![${alt}](${dataUrl})`;
        }
      }
      console.warn(`  Warning: image not found: ${src}`);
      return `![${alt}](${src})`;
    }
  );

  return mdi.render(processed);
}

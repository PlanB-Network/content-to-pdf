import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import type { Config } from "./config.js";
import { parseCourseMarkdown } from "./markdown.js";
import { generateCoverHtml } from "./templates/cover.js";
import { generateTocHtml, generateCourseBodyHtml, generateFinalPageHtml } from "./templates/course.js";
import { getSharedCss } from "./templates/styles.js";
import { generatePdf, type PdfFooter } from "./pdf.js";
import { imageToBase64, getGitShortHash, getTodayDate } from "./utils.js";

interface CourseYml {
  id: string;
  topic: string;
  type: string;
  level: string;
  hours: number;
}

export async function generateCoursePdf(
  code: string,
  lang: string,
  config: Config
): Promise<string> {
  const courseDir = resolve(config.becPath, "courses", code.toLowerCase());
  const mdPath = resolve(courseDir, `${lang}.md`);
  const ymlPath = resolve(courseDir, "course.yml");

  console.log(`  Reading ${mdPath}`);
  const rawMd = readFileSync(mdPath, "utf-8");
  const courseYml: CourseYml = parseYaml(readFileSync(ymlPath, "utf-8"));

  console.log("  Parsing markdown structure...");
  const parsed = parseCourseMarkdown(rawMd);

  console.log("  Generating cover page...");
  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: parsed.frontmatter.name,
    goal: parsed.frontmatter.goal,
    objectives: parsed.frontmatter.objectives,
    level: courseYml.level || "beginner",
    hours: courseYml.hours || 0,
    type: courseYml.type || "theory",
    topic: courseYml.topic || "bitcoin",
    blmsPath: config.blmsLocalesPath,
  });

  console.log("  Generating table of contents...");
  const tocHtml = generateTocHtml(
    parsed.parts,
    lang,
    config.blmsLocalesPath
  );

  console.log("  Rendering course content...");
  const bodyHtml = generateCourseBodyHtml(parsed.parts, courseDir, lang, config.blmsLocalesPath);

  console.log("  Generating final page...");
  const finalHtml = await generateFinalPageHtml(
    courseYml.id,
    parsed.reviewChapterId,
    lang
  );

  const fullHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(parsed.frontmatter.name)}</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${bodyHtml}
  ${finalHtml}
</body>
</html>`;

  // Build persistent footer
  const logoPath = resolve(config.becPath, "docs/PBN-template-repo/courses/topic101/assets/no-txt/PBN-logo.webp");
  const footer: PdfFooter = {
    versionText: `Version: ${getGitShortHash(config.becPath)} | ${getTodayDate()}`,
    logoBase64: imageToBase64(logoPath) || "",
  };

  const outputPath = resolve(config.outputDir, `${code.toLowerCase()}_${lang}.pdf`);
  console.log(`  Generating PDF → ${outputPath}`);
  await generatePdf(fullHtml, outputPath, footer);

  return outputPath;
}

function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

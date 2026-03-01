import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { CourseCredits, GenerateRequest, Translations } from '$lib/types.js';
import {
  fetchCourseMarkdown,
  fetchCourseYml,
  fetchQuizQuestions,
  fetchLocaleFile,
  fetchProfessorNames,
  fetchTutorialsMeta,
  fetchCoursesMeta
} from '$lib/server/github.js';
import { parseCourseMarkdown, parseTeacherGuideMarkdown, extractTutorialUrls, extractCourseUrls } from '$lib/markdown.js';
import { generateCoverHtml } from '$lib/templates/cover.js';
import {
  generateTocHtml,
  generateCourseBodyHtml,
  generateFinalPageHtml
} from '$lib/templates/course.js';
import {
  shuffleQuestions,
  generateQuizBodyHtml,
  generateAnswerKeyHtml
} from '$lib/templates/quiz.js';
import { getSharedCss, generateFooterHtml } from '$lib/templates/styles.js';
import { escapeHtml, formatCourseCode } from '$lib/utils.js';

async function loadLocales(lang: string): Promise<{
  locale: Translations | null;
  enLocale: Translations | null;
}> {
  const [locale, enLocale] = await Promise.all([
    fetchLocaleFile(lang),
    lang !== 'en' ? fetchLocaleFile('en') : Promise.resolve(null)
  ]);
  return {
    locale: locale as Translations | null,
    enLocale: lang === 'en' ? (locale as Translations | null) : (enLocale as Translations | null)
  };
}

async function generateCourseHtml(
  code: string,
  lang: string,
  platform: App.Platform | undefined,
  presenterName?: string,
  presenterLogo?: string
): Promise<{ html: string; title: string }> {
  // Fetch all data in parallel
  const [rawMd, courseYml, locales] = await Promise.all([
    fetchCourseMarkdown(code, lang),
    fetchCourseYml(code),
    loadLocales(lang)
  ]);

  const parsed = parseCourseMarkdown(rawMd);

  // Resolve credits data
  const professorIds = (courseYml.professors_id as string[]) || [];
  const teachers = await fetchProfessorNames(professorIds, platform);
  const contributorNames = (courseYml.contributor_names as string[]) || [];
  const originalLanguage = (courseYml.original_language as string) || '';

  const proofreadingEntries = (courseYml.proofreading as Array<{
    language: string;
    contributor_names?: string[];
  }>) || [];
  const langProof = proofreadingEntries.find((p) => p.language === lang);
  const proofreaders = langProof?.contributor_names || [];

  const credits: CourseCredits = {
    teachers,
    contributors: contributorNames,
    proofreaders,
    originalLanguage
  };

  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: parsed.frontmatter.name,
    goal: parsed.frontmatter.goal,
    objectives: parsed.frontmatter.objectives,
    level: (courseYml.level as string) || 'beginner',
    hours: (courseYml.hours as number) || 0,
    type: (courseYml.type as string) || 'theory',
    topic: (courseYml.topic as string) || 'bitcoin',
    locale: locales.locale,
    enLocale: locales.enLocale,
    presenterName,
    presenterLogo
  });

  const tocHtml = generateTocHtml(parsed.parts, locales.locale, locales.enLocale);

  const bodyHtml = generateCourseBodyHtml(
    parsed.parts,
    code,
    lang,
    locales.locale,
    locales.enLocale
  );

  const finalHtml = generateFinalPageHtml(
    code,
    courseYml.id as string,
    parsed.frontmatter.name || code.toUpperCase(),
    parsed.reviewChapterId,
    lang,
    credits,
    locales.locale,
    locales.enLocale
  );

  const title = parsed.frontmatter.name || code.toUpperCase();
  const footerHtml = generateFooterHtml(formatCourseCode(code), escapeHtml(title), presenterLogo);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${bodyHtml}
  ${finalHtml}
  ${footerHtml}
</body>
</html>`;

  return { html, title };
}

async function generateFullCourseHtml(
  code: string,
  lang: string,
  platform: App.Platform | undefined,
  presenterName?: string,
  presenterLogo?: string
): Promise<{ html: string; title: string }> {
  const [rawMd, courseYml, locales] = await Promise.all([
    fetchCourseMarkdown(code, lang),
    fetchCourseYml(code),
    loadLocales(lang)
  ]);

  const parsed = parseCourseMarkdown(rawMd, true);

  // Collect all tutorial and course URLs from chapter content and fetch metadata
  const allContent = parsed.parts.flatMap((p) => p.chapters.map((c) => c.content)).join('\n');
  const tutorialUrls = extractTutorialUrls(allContent);
  const courseUrls = extractCourseUrls(allContent);

  const [teachers, tutorialMetaMap, courseMetaMap] = await Promise.all([
    fetchProfessorNames((courseYml.professors_id as string[]) || [], platform),
    fetchTutorialsMeta(tutorialUrls, lang),
    fetchCoursesMeta(courseUrls, lang)
  ]);

  const contributorNames = (courseYml.contributor_names as string[]) || [];
  const originalLanguage = (courseYml.original_language as string) || '';

  const proofreadingEntries = (courseYml.proofreading as Array<{
    language: string;
    contributor_names?: string[];
  }>) || [];
  const langProof = proofreadingEntries.find((p) => p.language === lang);
  const proofreaders = langProof?.contributor_names || [];

  const credits: CourseCredits = {
    teachers,
    contributors: contributorNames,
    proofreaders,
    originalLanguage
  };

  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: parsed.frontmatter.name,
    goal: parsed.frontmatter.goal,
    objectives: parsed.frontmatter.objectives,
    level: (courseYml.level as string) || 'beginner',
    hours: (courseYml.hours as number) || 0,
    type: (courseYml.type as string) || 'theory',
    topic: (courseYml.topic as string) || 'bitcoin',
    locale: locales.locale,
    enLocale: locales.enLocale,
    presenterName,
    presenterLogo
  });

  const tocHtml = generateTocHtml(parsed.parts, locales.locale, locales.enLocale);

  const bodyHtml = generateCourseBodyHtml(
    parsed.parts,
    code,
    lang,
    locales.locale,
    locales.enLocale,
    true,
    tutorialMetaMap,
    courseMetaMap
  );

  const finalHtml = generateFinalPageHtml(
    code,
    courseYml.id as string,
    parsed.frontmatter.name || code.toUpperCase(),
    parsed.reviewChapterId,
    lang,
    credits,
    locales.locale,
    locales.enLocale
  );

  const title = `${parsed.frontmatter.name || code.toUpperCase()} — Full`;
  const footerHtml = generateFooterHtml(formatCourseCode(code), escapeHtml(parsed.frontmatter.name || code.toUpperCase()), presenterLogo);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${bodyHtml}
  ${finalHtml}
  ${footerHtml}
</body>
</html>`;

  return { html, title };
}

async function generateQuizHtml(
  code: string,
  lang: string,
  count: number | undefined,
  platform: App.Platform | undefined,
  presenterName?: string,
  presenterLogo?: string
): Promise<{ html: string; title: string }> {
  // Fetch all data in parallel
  const [questionsRaw, courseYml, rawMd, locales] = await Promise.all([
    fetchQuizQuestions(code, lang, platform),
    fetchCourseYml(code),
    fetchCourseMarkdown(code, lang).catch(() => null),
    loadLocales(lang)
  ]);

  let questions = questionsRaw;

  if (questions.length === 0) {
    throw new Error(`No quiz questions found for ${code} in ${lang}`);
  }

  // Random subset if count specified
  if (count && count < questions.length) {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    questions = shuffled.slice(0, count);
  }

  // Get course name from markdown frontmatter
  let courseName = code.toUpperCase();
  let courseGoal = '';
  if (rawMd) {
    const nameMatch = rawMd.match(/^name:\s*(.+)$/m);
    if (nameMatch) courseName = nameMatch[1].trim();
    const goalMatch = rawMd.match(/^goal:\s*(.+)$/m);
    if (goalMatch) courseGoal = goalMatch[1].trim();
  }

  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: courseName,
    goal: courseGoal,
    objectives: [],
    level: (courseYml.level as string) || 'beginner',
    hours: (courseYml.hours as number) || 0,
    type: (courseYml.type as string) || 'theory',
    topic: (courseYml.topic as string) || 'bitcoin',
    isQuiz: true,
    questionCount: questions.length,
    locale: locales.locale,
    enLocale: locales.enLocale,
    presenterName,
    presenterLogo
  });

  const shuffled = shuffleQuestions(questions);
  const quizHtml = generateQuizBodyHtml(shuffled, code, locales.locale, locales.enLocale);

  const answerKeyHtml = generateAnswerKeyHtml(shuffled, locales.locale, locales.enLocale);

  const title = `${courseName} - Quiz`;
  const footerHtml = generateFooterHtml(formatCourseCode(code), escapeHtml(courseName), presenterLogo);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${quizHtml}
  ${answerKeyHtml}
  ${footerHtml}
</body>
</html>`;

  return { html, title };
}

async function generateTeacherGuideHtml(
  code: string,
  lang: string,
  requestUrl: string,
  presenterName?: string,
  presenterLogo?: string
): Promise<{ html: string; title: string }> {
  // Fetch the teacher guide markdown from the static directory
  const origin = new URL(requestUrl).origin;
  const guideRes = await fetch(`${origin}/ready-to-teach/${code}-${lang}.md`);
  if (!guideRes.ok) {
    throw new Error(`Teacher guide not available for ${code} (${lang}).`);
  }
  const rawMd = await guideRes.text();

  const [locales, courseYml, courseMd] = await Promise.all([
    loadLocales(lang),
    fetchCourseYml(code),
    fetchCourseMarkdown(code, lang)
  ]);

  const parsed = parseTeacherGuideMarkdown(rawMd);
  const courseParsed = parseCourseMarkdown(courseMd);

  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: parsed.frontmatter.name,
    goal: courseParsed.frontmatter.goal || parsed.frontmatter.goal,
    objectives: courseParsed.frontmatter.objectives.length > 0
      ? courseParsed.frontmatter.objectives
      : parsed.frontmatter.objectives,
    level: (courseYml.level as string) || 'beginner',
    hours: (courseYml.hours as number) || 0,
    type: 'teacher-guide',
    topic: (courseYml.topic as string) || 'bitcoin',
    locale: locales.locale,
    enLocale: locales.enLocale,
    presenterName,
    presenterLogo
  });

  const tocHtml = generateTocHtml(parsed.parts, locales.locale, locales.enLocale);

  const bodyHtml = generateCourseBodyHtml(
    parsed.parts,
    code,
    lang,
    locales.locale,
    locales.enLocale
  );

  const title = parsed.frontmatter.name || `${code.toUpperCase()} — Teacher Guide`;
  const footerHtml = generateFooterHtml(formatCourseCode(code), escapeHtml(title), presenterLogo);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${bodyHtml}
  ${footerHtml}
</body>
</html>`;

  return { html, title };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body: GenerateRequest = await request.json();
    const { code, lang, type, count, presenterName, presenterLogo } = body;

    if (!code || !lang || !type) {
      return json({ error: 'Missing required fields: code, lang, type' }, { status: 400 });
    }

    let result: { html: string; title: string };

    if (type === 'course') {
      result = await generateCourseHtml(code, lang, platform, presenterName, presenterLogo);
    } else if (type === 'quiz') {
      result = await generateQuizHtml(code, lang, count, platform, presenterName, presenterLogo);
    } else if (type === 'teacher-guide') {
      result = await generateTeacherGuideHtml(code, lang, request.url, presenterName, presenterLogo);
    } else if (type === 'course-full') {
      result = await generateFullCourseHtml(code, lang, platform, presenterName, presenterLogo);
    } else {
      return json({ error: 'Invalid type.' }, { status: 400 });
    }

    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return json({ error: message }, { status: 500 });
  }
};

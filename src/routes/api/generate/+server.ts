import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { GenerateRequest, Translations } from '$lib/types.js';
import {
  fetchCourseMarkdown,
  fetchCourseYml,
  fetchQuizQuestions,
  fetchLocaleFile
} from '$lib/server/github.js';
import { parseCourseMarkdown } from '$lib/markdown.js';
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
import { getSharedCss } from '$lib/templates/styles.js';
import { escapeHtml } from '$lib/utils.js';

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
  platform: App.Platform | undefined
): Promise<{ html: string; title: string }> {
  // Fetch all data in parallel
  const [rawMd, courseYml, locales] = await Promise.all([
    fetchCourseMarkdown(code, lang),
    fetchCourseYml(code),
    loadLocales(lang)
  ]);

  const parsed = parseCourseMarkdown(rawMd);

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
    enLocale: locales.enLocale
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
    courseYml.id as string,
    parsed.reviewChapterId,
    lang
  );

  const title = parsed.frontmatter.name || code.toUpperCase();

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
</body>
</html>`;

  return { html, title };
}

async function generateQuizHtml(
  code: string,
  lang: string,
  count: number | undefined,
  answers: boolean,
  platform: App.Platform | undefined
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
    enLocale: locales.enLocale
  });

  const shuffled = shuffleQuestions(questions);
  const quizHtml = generateQuizBodyHtml(shuffled, code, locales.locale, locales.enLocale);

  let answerKeyHtml = '';
  if (answers) {
    answerKeyHtml = generateAnswerKeyHtml(shuffled, locales.locale, locales.enLocale);
  }

  const title = `${courseName} - Quiz`;

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
</body>
</html>`;

  return { html, title };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body: GenerateRequest = await request.json();
    const { code, lang, mode, count, answers } = body;

    if (!code || !lang || !mode) {
      return json({ error: 'Missing required fields: code, lang, mode' }, { status: 400 });
    }

    let result: { html: string; title: string };

    if (mode === 'course') {
      result = await generateCourseHtml(code, lang, platform);
    } else if (mode === 'quiz') {
      result = await generateQuizHtml(code, lang, count, answers ?? false, platform);
    } else {
      return json({ error: 'Invalid mode. Use "course" or "quiz".' }, { status: 400 });
    }

    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return json({ error: message }, { status: 500 });
  }
};

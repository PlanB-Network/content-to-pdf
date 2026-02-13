import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import type { Config } from "./config.js";
import type { QuizQuestion } from "./templates/quiz.js";
import { shuffleQuestions, generateQuizBodyHtml, generateAnswerKeyHtml } from "./templates/quiz.js";
import { generateCoverHtml } from "./templates/cover.js";
import { getSharedCss } from "./templates/styles.js";
import { generatePdf, type PdfFooter } from "./pdf.js";
import { imageToBase64, getGitShortHash, getTodayDate } from "./utils.js";

interface QuestionYml {
  id: string;
  chapterId: string;
  difficulty: string;
}

interface TranslationYml {
  question: string;
  answer: string;
  wrong_answers: string[];
  explanation: string;
}

export function loadQuizQuestions(
  code: string,
  lang: string,
  becPath: string
): QuizQuestion[] {
  const quizzDir = resolve(becPath, "courses", code.toLowerCase(), "quizz");
  if (!existsSync(quizzDir)) return [];

  const dirs = readdirSync(quizzDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const questions: QuizQuestion[] = [];

  for (const dir of dirs) {
    const qDir = resolve(quizzDir, dir.name);
    const questionYmlPath = resolve(qDir, "question.yml");
    if (!existsSync(questionYmlPath)) continue;

    const qYml: QuestionYml = parseYaml(readFileSync(questionYmlPath, "utf-8"));

    // Try requested lang, fallback to en
    let transPath = resolve(qDir, `${lang}.yml`);
    if (!existsSync(transPath)) {
      transPath = resolve(qDir, "en.yml");
      if (!existsSync(transPath)) continue;
    }

    const trans: TranslationYml = parseYaml(readFileSync(transPath, "utf-8"));
    if (!trans.question || !trans.answer || !trans.wrong_answers) continue;

    questions.push({
      index: questions.length + 1,
      chapterId: qYml.chapterId || "",
      question: trans.question,
      correctAnswer: trans.answer,
      wrongAnswers: trans.wrong_answers,
      explanation: trans.explanation || "",
      difficulty: qYml.difficulty || "medium",
    });
  }

  return questions;
}

export async function generateQuizPdf(
  code: string,
  lang: string,
  config: Config,
  options: { count?: number; answers?: boolean }
): Promise<string> {
  console.log("  Loading quiz questions...");
  let questions = loadQuizQuestions(code, lang, config.becPath);

  if (questions.length === 0) {
    throw new Error(`No quiz questions found for ${code} in ${lang}`);
  }

  console.log(`  Found ${questions.length} questions`);

  // Random subset if count specified
  if (options.count && options.count < questions.length) {
    // Fisher-Yates to pick random subset
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    questions = shuffled.slice(0, options.count);
  }

  // Read course.yml for metadata
  const courseDir = resolve(config.becPath, "courses", code.toLowerCase());
  const ymlPath = resolve(courseDir, "course.yml");
  const courseYml = parseYaml(readFileSync(ymlPath, "utf-8"));

  // Read frontmatter from markdown for course name and goal
  const mdPath = resolve(courseDir, `${lang}.md`);
  let courseName = code.toUpperCase();
  let courseGoal = "";
  if (existsSync(mdPath)) {
    const mdContent = readFileSync(mdPath, "utf-8");
    const nameMatch = mdContent.match(/^name:\s*(.+)$/m);
    if (nameMatch) courseName = nameMatch[1].trim();
    const goalMatch = mdContent.match(/^goal:\s*(.+)$/m);
    if (goalMatch) courseGoal = goalMatch[1].trim();
  }

  console.log("  Generating cover page...");
  const coverHtml = generateCoverHtml({
    courseCode: code,
    lang,
    name: courseName,
    goal: courseGoal,
    objectives: [],
    level: courseYml.level || "beginner",
    hours: courseYml.hours || 0,
    type: courseYml.type || "theory",
    topic: courseYml.topic || "bitcoin",
    isQuiz: true,
    questionCount: questions.length,
    blmsPath: config.blmsLocalesPath,
  });

  console.log("  Shuffling and generating quiz...");
  const shuffled = shuffleQuestions(questions);
  const quizHtml = generateQuizBodyHtml(shuffled, code, lang, config.blmsLocalesPath);

  let answerKeyHtml = "";
  if (options.answers) {
    console.log("  Generating answer key...");
    answerKeyHtml = generateAnswerKeyHtml(shuffled, lang, config.blmsLocalesPath);
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(courseName)} - Quiz</title>
  <style>${getSharedCss()}</style>
</head>
<body>
  ${coverHtml}
  ${quizHtml}
  ${answerKeyHtml}
</body>
</html>`;

  // Build persistent footer
  const logoPath = resolve(config.becPath, "docs/PBN-template-repo/courses/topic101/assets/no-txt/PBN-logo.webp");
  const footer: PdfFooter = {
    versionText: `Version: ${getGitShortHash(config.becPath)} | ${getTodayDate()}`,
    logoBase64: imageToBase64(logoPath) || "",
  };

  const suffix = options.answers ? "_quiz_answers" : "_quiz";
  const outputPath = resolve(config.outputDir, `${code.toLowerCase()}_${lang}${suffix}.pdf`);
  console.log(`  Generating PDF → ${outputPath}`);
  await generatePdf(fullHtml, outputPath, footer);

  return outputPath;
}

function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

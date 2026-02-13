import { formatCourseCode, getLanguageName, getTodayDate } from "../utils.js";
import { t } from "../i18n.js";

export interface CoverOptions {
  courseCode: string;
  lang: string;
  name: string;
  goal: string;
  objectives: string[];
  level: string;
  hours: number;
  type: string;
  topic: string;
  isQuiz?: boolean;
  questionCount?: number;
  blmsPath: string;
}

export function generateCoverHtml(options: CoverOptions): string {
  const {
    courseCode, lang, name, goal, objectives,
    isQuiz, questionCount, blmsPath,
  } = options;

  const today = getTodayDate();
  const langName = getLanguageName(lang);
  const formattedCode = formatCourseCode(courseCode);
  const quizLabel = t(lang, "courses.quizz.quizz", blmsPath);
  const learningLabel = t(lang, "courses.details.learning", blmsPath);
  const objectivesTitle = t(lang, "courses.details.objectivesTitle", blmsPath);
  const translatedGoal = t(lang, "words.goal", blmsPath);

  const quizSubtitle = isQuiz
    ? `<p class="cover-subtitle">${escapeHtml(quizLabel)}${questionCount ? ` — ${questionCount} questions` : ""}</p>`
    : "";

  // Learning path / objectives on cover
  let objectivesHtml = "";
  if (!isQuiz && objectives && objectives.length > 0) {
    objectivesHtml = `
      <div class="cover-objectives">
        <div class="cover-objectives-label">${escapeHtml(learningLabel)}</div>
        <p class="cover-objectives-title">${escapeHtml(objectivesTitle)}</p>
        <ul class="objectives-list">
          ${objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("\n          ")}
        </ul>
      </div>
    `;
  }

  return `
    <div class="cover-page">
      <h1 class="cover-title">${escapeHtml(name)}</h1>
      <p class="cover-code">${formattedCode}</p>
      ${quizSubtitle}
      <p class="cover-meta">${langName} | ${today}</p>

      <div class="cover-goal">
        <div class="cover-goal-label">${escapeHtml(translatedGoal)}</div>
        ${escapeHtml(goal)}
      </div>

      ${objectivesHtml}
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

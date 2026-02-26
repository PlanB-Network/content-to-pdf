import { formatCourseCode, getLanguageName, getTodayDate, escapeHtml } from '../utils.js';
import { t } from '../i18n.js';
import type { Translations } from '../types.js';

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
  locale: Translations | null;
  enLocale: Translations | null;
}

export function generateCoverHtml(options: CoverOptions): string {
  const {
    courseCode,
    lang,
    name,
    goal,
    objectives,
    isQuiz,
    questionCount,
    locale,
    enLocale
  } = options;

  const today = getTodayDate();
  const langName = getLanguageName(lang);
  const formattedCode = formatCourseCode(courseCode);
  const quizLabel = t(locale, enLocale, 'courses.quizz.quizz');
  const learningLabel = t(locale, enLocale, 'courses.details.learning');
  const objectivesTitle = t(locale, enLocale, 'courses.details.objectivesTitle');
  const translatedGoal = t(locale, enLocale, 'words.goal');

  const quizSubtitle = isQuiz
    ? `<p class="cover-subtitle">${escapeHtml(quizLabel)}${questionCount ? ` — ${questionCount} questions` : ''}</p>`
    : '';

  let objectivesHtml = '';
  if (!isQuiz && objectives && objectives.length > 0) {
    objectivesHtml = `
      <div class="cover-objectives">
        <div class="cover-objectives-label">${escapeHtml(learningLabel)}</div>
        <p class="cover-objectives-title">${escapeHtml(objectivesTitle)}</p>
        <ul class="objectives-list">
          ${objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join('\n          ')}
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

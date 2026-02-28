import { t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import type { QuizQuestion, ShuffledQuestion, Translations } from '../types.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export function shuffleQuestions(questions: QuizQuestion[]): ShuffledQuestion[] {
  return questions.map((q, i) => {
    const allAnswers = [q.correctAnswer, ...q.wrongAnswers];
    // Fisher-Yates shuffle
    for (let j = allAnswers.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [allAnswers[j], allAnswers[k]] = [allAnswers[k], allAnswers[j]];
    }
    const choices = allAnswers.map((text, idx) => ({
      letter: LETTERS[idx] || String(idx + 1),
      text
    }));
    const correctLetter =
      choices.find((c) => c.text === q.correctAnswer)?.letter || '?';

    return {
      index: i + 1,
      question: q.question,
      choices,
      correctLetter,
      explanation: q.explanation
    };
  });
}

export function generateQuizBodyHtml(
  questions: ShuffledQuestion[],
  courseCode: string,
  locale: Translations | null,
  enLocale: Translations | null
): string {
  const quizLabel = t(locale, enLocale, 'courses.quizz.quizz');

  let html = `<div class="quiz-header-box">${escapeHtml(quizLabel)} — ${courseCode.toUpperCase()} (${questions.length} questions)</div>\n`;

  for (const q of questions) {
    html += `
      <div class="question-block">
        <div class="question-number">Q${q.index}</div>
        <div class="question-text">${escapeHtml(q.question)}</div>
        ${q.choices
          .map(
            (c) => `
          <div class="choice">
            <span class="choice-letter">${c.letter}</span>
            <span class="choice-text">${escapeHtml(c.text)}</span>
          </div>`
          )
          .join('\n')}
      </div>
    `;
  }

  return html;
}

export function generateAnswerKeyHtml(
  questions: ShuffledQuestion[],
  locale: Translations | null,
  enLocale: Translations | null
): string {
  const answersLabel = t(locale, enLocale, 'courses.exam.answersReview');

  let html = `<div class="answer-key answer-key-title">${escapeHtml(answersLabel)}</div>\n`;

  for (const q of questions) {
    html += `
      <div class="answer-item">
        <div class="answer-item-header">
          Q${q.index}: <span class="answer-correct">${q.correctLetter}</span>
          — ${escapeHtml(q.choices.find((c) => c.letter === q.correctLetter)?.text || '')}
        </div>
        ${q.explanation ? `<div class="answer-explanation">${escapeHtml(q.explanation.trim())}</div>` : ''}
      </div>
    `;
  }

  return html;
}

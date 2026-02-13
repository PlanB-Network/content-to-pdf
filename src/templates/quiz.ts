import { t } from "../i18n.js";

export interface QuizQuestion {
  index: number;
  chapterId: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  explanation: string;
  difficulty: string;
}

export interface ShuffledQuestion {
  index: number;
  question: string;
  choices: { letter: string; text: string }[];
  correctLetter: string;
  explanation: string;
}

const LETTERS = ["A", "B", "C", "D"];

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
      text,
    }));
    const correctLetter =
      choices.find((c) => c.text === q.correctAnswer)?.letter || "?";

    return {
      index: i + 1,
      question: q.question,
      choices,
      correctLetter,
      explanation: q.explanation,
    };
  });
}

export function generateQuizBodyHtml(
  questions: ShuffledQuestion[],
  courseCode: string,
  lang: string,
  blmsPath: string
): string {
  const quizLabel = t(lang, "courses.quizz.quizz", blmsPath);

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
          .join("\n")}
      </div>
    `;
  }

  return html;
}

export function generateAnswerKeyHtml(
  questions: ShuffledQuestion[],
  lang: string,
  blmsPath: string
): string {
  const answersLabel = t(lang, "courses.exam.answersReview", blmsPath);

  let html = `
    <div class="answer-key">
      <div class="answer-key-title">${escapeHtml(answersLabel)}</div>
  `;

  for (const q of questions) {
    html += `
      <div class="answer-item">
        <div class="answer-item-header">
          Q${q.index}: <span class="answer-correct">${q.correctLetter}</span>
          — ${escapeHtml(q.choices.find((c) => c.letter === q.correctLetter)?.text || "")}
        </div>
        ${q.explanation ? `<div class="answer-explanation">${escapeHtml(q.explanation.trim())}</div>` : ""}
      </div>
    `;
  }

  html += "</div>";
  return html;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

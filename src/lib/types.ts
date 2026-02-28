export interface CourseInfo {
  code: string;
  name: string;
  level: string;
  topic: string;
  languages: string[];
}

export interface GenerateRequest {
  code: string;
  lang: string;
  mode: 'course' | 'quiz';
  count?: number;
  answers?: boolean;
}

export interface GenerateResponse {
  html: string;
  title: string;
}

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

export type Translations = Record<string, unknown>;

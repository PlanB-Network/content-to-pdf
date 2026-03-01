export interface CourseInfo {
  code: string;
  name: string;
  level: string;
  topic: string;
  languages: string[];
}

export type PdfType = 'course' | 'course-full' | 'quiz' | 'teacher-guide';

export interface GenerateRequest {
  code: string;
  lang: string;
  type: PdfType;
  count?: number;
  presenterName?: string;
  presenterLogo?: string;
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

export interface CourseCredits {
  teachers: string[];
  contributors: string[];
  proofreaders: string[];
  originalLanguage: string;
}

export interface TutorialMeta {
  name: string;
  description: string;
  logoUrl: string | null;
}

export interface CourseMeta {
  code: string;
  name: string;
  goal: string;
  thumbnailUrl: string;
}

export type Translations = Record<string, unknown>;

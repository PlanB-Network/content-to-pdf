import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DEFAULTS: Record<string, string> = {
  "words.course": "Course",
  "words.chapter": "Chapter",
  "words.hours": "hours",
  "words.goal": "Goal",
  "words.description": "Description",
  "words.free": "Free",
  "words.online": "Online",
  "words.level.beginner": "Beginner",
  "words.level.intermediate": "Intermediate",
  "words.level.advanced": "Advanced",
  "words.level.expert": "Expert",
  "words.level.level": "Level",
  "courses.details.curriculum": "Curriculum",
  "courses.details.objectives": "Objectives",
  "courses.details.objectivesTitle": "What you will learn:",
  "courses.details.taughtBy": "This course is taught by",
  "courses.details.description": "Description",
  "courses.details.learning": "Learning path",
  "courses.quizz.quizz": "Quiz",
  "courses.exam.answersReview": "Answers review",
  "courses.exam.finalExam": "Final exam",
  "courses.exam.explanations": "Explanations",
};

type LocaleData = Record<string, unknown>;

const cache = new Map<string, LocaleData>();

function loadLocaleFile(lang: string, blmsPath: string): LocaleData | null {
  const key = `${blmsPath}/${lang}`;
  if (cache.has(key)) return cache.get(key)!;

  const filePath = resolve(blmsPath, `${lang}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

function getNestedValue(obj: LocaleData, keyPath: string): string | undefined {
  const keys = keyPath.split(".");
  let current: unknown = obj;
  for (const k of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[k];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(
  lang: string,
  keyPath: string,
  blmsPath: string
): string {
  // Try requested language
  const locale = loadLocaleFile(lang, blmsPath);
  if (locale) {
    const val = getNestedValue(locale, keyPath);
    if (val) return val;
  }

  // Fallback to English
  if (lang !== "en") {
    const enLocale = loadLocaleFile("en", blmsPath);
    if (enLocale) {
      const val = getNestedValue(enLocale, keyPath);
      if (val) return val;
    }
  }

  // Fallback to hardcoded defaults
  return DEFAULTS[keyPath] || keyPath;
}

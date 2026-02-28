import type { Translations } from './types.js';

const DEFAULTS: Record<string, string> = {
  'words.course': 'Course',
  'words.chapter': 'Chapter',
  'words.hours': 'hours',
  'words.goal': 'Goal',
  'words.description': 'Description',
  'words.free': 'Free',
  'words.online': 'Online',
  'words.level.beginner': 'Beginner',
  'words.level.intermediate': 'Intermediate',
  'words.level.advanced': 'Advanced',
  'words.level.expert': 'Expert',
  'words.level.level': 'Level',
  'courses.details.curriculum': 'Curriculum',
  'courses.details.objectives': 'Objectives',
  'courses.details.objectivesTitle': 'What you will learn:',
  'courses.details.taughtBy': 'This course is taught by',
  'courses.details.description': 'Description',
  'courses.details.learning': 'Learning path',
  'courses.quizz.quizz': 'Quiz',
  'courses.exam.answersReview': 'Answers review',
  'courses.exam.finalExam': 'Final exam',
  'courses.exam.explanations': 'Explanations',
  'courses.final.endOfCourse': 'End of',
  'courses.final.thankYouCompleting': 'Thank you for completing this course.',
  'courses.final.leaveReview': 'If you enjoyed this course, please leave a review on the platform.',
  'courses.final.credits': 'Credits',
  'courses.final.teacher': 'Teacher',
  'courses.final.contributors': 'Contributors',
  'courses.final.proofreaders': 'Proofreaders',
  'courses.final.license': 'License',
  'courses.final.source': 'Source',
  'courses.final.contribute': 'If you want to contribute or make improvements, feel free to join our community or create a PR.',
  'courses.final.discoverMore': 'Discover more courses on',
  'courses.final.thankYouDedication': 'Thank you for your dedication to Bitcoin study.',
  'courses.final.thankYouInstructor': 'Thank you to the instructor who chose to use our free and open-source educational content.'
};

function getNestedValue(obj: Translations, keyPath: string): string | undefined {
  const keys = keyPath.split('.');
  let current: unknown = obj;
  for (const k of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[k];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key path using pre-loaded locale data.
 * Falls back to English locale, then to hardcoded defaults.
 */
export function t(
  locale: Translations | null,
  enLocale: Translations | null,
  keyPath: string
): string {
  // Try requested language
  if (locale) {
    const val = getNestedValue(locale, keyPath);
    if (val) return val;
  }

  // Fallback to English
  if (enLocale) {
    const val = getNestedValue(enLocale, keyPath);
    if (val) return val;
  }

  // Fallback to hardcoded defaults
  return DEFAULTS[keyPath] || keyPath;
}

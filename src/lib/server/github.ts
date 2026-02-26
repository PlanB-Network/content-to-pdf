import { parse as parseYaml } from 'yaml';
import { getEnv } from './env.js';
import type { CourseInfo, QuizQuestion } from '../types.js';

const BEC_OWNER = 'PlanB-Network';
const BEC_REPO = 'bitcoin-educational-content';
const BEC_BRANCH = 'dev';

const BLMS_OWNER = 'PlanB-Network';
const BLMS_REPO = 'bitcoin-learning-management-system';
const BLMS_BRANCH = 'main';

const RAW_BASE = `https://raw.githubusercontent.com/${BEC_OWNER}/${BEC_REPO}/${BEC_BRANCH}`;
const BLMS_RAW_BASE = `https://raw.githubusercontent.com/${BLMS_OWNER}/${BLMS_REPO}/${BLMS_BRANCH}`;

// In-memory cache for course list
let coursesCache: { data: CourseInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function authHeaders(platform: App.Platform | undefined): Record<string, string> {
  const token = getEnv('GITHUB_TOKEN', platform);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'content-to-pdf'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * List all available courses with their languages using the GitHub Tree API.
 */
export async function listCourses(platform: App.Platform | undefined): Promise<CourseInfo[]> {
  if (coursesCache && Date.now() - coursesCache.timestamp < CACHE_TTL) {
    return coursesCache.data;
  }

  const url = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/git/trees/${BEC_BRANCH}?recursive=1`;
  const res = await fetch(url, { headers: authHeaders(platform) });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const tree: { tree: { path: string; type: string }[] } = await res.json();

  const courseMap = new Map<string, Set<string>>();

  for (const item of tree.tree) {
    // Match courses/{code}/course.yml to discover course codes
    const ymlMatch = item.path.match(/^courses\/([^/]+)\/course\.yml$/);
    if (ymlMatch) {
      const code = ymlMatch[1];
      if (!courseMap.has(code)) courseMap.set(code, new Set());
    }

    // Match courses/{code}/{lang}.md to discover languages
    const mdMatch = item.path.match(/^courses\/([^/]+)\/([a-z]{2}(?:-[A-Za-z]+)?)\.md$/);
    if (mdMatch) {
      const code = mdMatch[1];
      const lang = mdMatch[2];
      if (!courseMap.has(code)) courseMap.set(code, new Set());
      courseMap.get(code)!.add(lang);
    }
  }

  const courses: CourseInfo[] = [];
  for (const [code, langs] of courseMap) {
    if (langs.size > 0) {
      courses.push({
        code,
        languages: [...langs].sort()
      });
    }
  }

  courses.sort((a, b) => a.code.localeCompare(b.code));

  coursesCache = { data: courses, timestamp: Date.now() };
  return courses;
}

/**
 * Fetch course markdown content from GitHub.
 */
export async function fetchCourseMarkdown(code: string, lang: string): Promise<string> {
  const url = `${RAW_BASE}/courses/${code}/${lang}.md`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Course markdown not found: ${code}/${lang} (${res.status})`);
  }
  return res.text();
}

/**
 * Fetch course.yml metadata from GitHub.
 */
export async function fetchCourseYml(code: string): Promise<Record<string, unknown>> {
  const url = `${RAW_BASE}/courses/${code}/course.yml`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Course YAML not found: ${code} (${res.status})`);
  }
  const text = await res.text();
  return parseYaml(text) as Record<string, unknown>;
}

/**
 * Build a raw GitHub URL for a course image.
 */
export function getImageUrl(code: string, imgRef: string, lang: string): string {
  const cleaned = imgRef.replace(/^\.\//, '');

  // If it already has a path with assets, use it directly
  if (cleaned.startsWith('assets/')) {
    return `${RAW_BASE}/courses/${code}/${cleaned}`;
  }

  // Default: try assets/{lang}/{filename}
  return `${RAW_BASE}/courses/${code}/assets/${lang}/${cleaned}`;
}

/**
 * Fetch quiz questions from the BEC repo via GitHub API.
 */
export async function fetchQuizQuestions(
  code: string,
  lang: string,
  platform: App.Platform | undefined
): Promise<QuizQuestion[]> {
  // Get the tree for the quizz directory
  const treeUrl = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/git/trees/${BEC_BRANCH}?recursive=1`;
  const res = await fetch(treeUrl, { headers: authHeaders(platform) });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const tree: { tree: { path: string; type: string }[] } = await res.json();
  const quizzPrefix = `courses/${code}/quizz/`;

  // Find all question directories
  const questionDirs = new Set<string>();
  for (const item of tree.tree) {
    if (item.path.startsWith(quizzPrefix) && item.path.endsWith('/question.yml')) {
      const dir = item.path.replace('/question.yml', '');
      questionDirs.add(dir);
    }
  }

  const sortedDirs = [...questionDirs].sort();
  const questions: QuizQuestion[] = [];

  // Fetch each question in parallel
  const fetchPromises = sortedDirs.map(async (dir) => {
    try {
      // Fetch question.yml
      const qRes = await fetch(`${RAW_BASE}/${dir}/question.yml`);
      if (!qRes.ok) return null;
      const qYml = parseYaml(await qRes.text()) as {
        id?: string;
        chapterId?: string;
        difficulty?: string;
      };

      // Try requested lang, fallback to en
      let transRes = await fetch(`${RAW_BASE}/${dir}/${lang}.yml`);
      if (!transRes.ok) {
        transRes = await fetch(`${RAW_BASE}/${dir}/en.yml`);
        if (!transRes.ok) return null;
      }

      const trans = parseYaml(await transRes.text()) as {
        question?: string;
        answer?: string;
        wrong_answers?: string[];
        explanation?: string;
      };

      if (!trans.question || !trans.answer || !trans.wrong_answers) return null;

      return {
        chapterId: qYml.chapterId || '',
        question: trans.question,
        correctAnswer: trans.answer,
        wrongAnswers: trans.wrong_answers,
        explanation: trans.explanation || '',
        difficulty: qYml.difficulty || 'medium'
      } satisfies Omit<QuizQuestion, 'index'>;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  for (const result of results) {
    if (result) {
      questions.push({
        ...result,
        index: questions.length + 1
      });
    }
  }

  return questions;
}

/**
 * Fetch the latest commit date for a course file (used as version info).
 * Returns a short date string like "2025-01-15" or null on failure.
 */
export async function fetchCourseLastCommit(
  code: string,
  lang: string,
  platform: App.Platform | undefined
): Promise<string | null> {
  const path = `courses/${code}/${lang}.md`;
  const url = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/commits?path=${encodeURIComponent(path)}&sha=${BEC_BRANCH}&per_page=1`;
  try {
    const res = await fetch(url, { headers: authHeaders(platform) });
    if (!res.ok) return null;
    const commits = (await res.json()) as { commit: { committer: { date: string } } }[];
    if (commits.length === 0) return null;
    return commits[0].commit.committer.date.slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * Fetch a BLMS locale file for translations.
 */
export async function fetchLocaleFile(lang: string): Promise<Record<string, unknown> | null> {
  const url = `${BLMS_RAW_BASE}/apps/academy/public/locales/${lang}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
 * Fetch course metadata (level & topic) from course.yml.
 * Names are resolved client-side to avoid worker rate-limiting.
 */
async function fetchCourseMeta(
  code: string
): Promise<{ level: string; topic: string }> {
  try {
    const url = `${RAW_BASE}/courses/${code}/course.yml`;
    const res = await fetch(url);
    if (!res.ok) return { level: '', topic: '' };
    const yml = parseYaml(await res.text()) as Record<string, unknown>;
    return {
      level: (yml.level as string) || '',
      topic: (yml.topic as string) || ''
    };
  } catch {
    return { level: '', topic: '' };
  }
}

/**
 * Run async tasks with a concurrency limit to avoid GitHub rate limits.
 */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/**
 * Parse a course code into its prefix (letters) and number for sorting.
 */
function parseCourseCode(code: string): { prefix: string; num: number } {
  const match = code.match(/^([a-zA-Z-]+?)(\d+)$/);
  if (!match) return { prefix: code, num: 0 };
  return { prefix: match[1], num: parseInt(match[2], 10) };
}

/**
 * List all available course codes with names, sorted by ID type.
 * Languages are loaded lazily per-course via listCourseLanguages().
 */
export async function listCourses(platform: App.Platform | undefined): Promise<CourseInfo[]> {
  if (coursesCache && Date.now() - coursesCache.timestamp < CACHE_TTL) {
    return coursesCache.data;
  }

  const headers = authHeaders(platform);

  // Single API call: list course directories via Contents API
  const url = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/contents/courses?ref=${BEC_BRANCH}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const entries: { name: string; type: string }[] = await res.json();
  const codes = entries.filter((e) => e.type === 'dir').map((e) => e.name);

  // Fetch metadata with limited concurrency (names resolved client-side)
  const infos = await mapConcurrent(codes, 10, (code) => fetchCourseMeta(code));

  const courses: CourseInfo[] = codes.map((code, i) => ({
    code,
    name: '',
    level: infos[i].level,
    topic: infos[i].topic,
    languages: []
  }));

  // Sort by prefix alphabetically, then by number within each prefix
  courses.sort((a, b) => {
    const pa = parseCourseCode(a.code);
    const pb = parseCourseCode(b.code);
    if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
    return pa.num - pb.num;
  });

  coursesCache = { data: courses, timestamp: Date.now() };
  return courses;
}

// Per-course language cache
const langCache = new Map<string, { data: string[]; timestamp: number }>();

/**
 * Fetch available languages for a specific course (1 API call).
 */
export async function listCourseLanguages(
  code: string,
  platform: App.Platform | undefined
): Promise<string[]> {
  const cached = langCache.get(code);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const headers = authHeaders(platform);
  const url = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/contents/courses/${code}?ref=${BEC_BRANCH}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];

  const files: { name: string }[] = await res.json();
  const languages = files
    .map((f) => f.name.match(/^([a-z]{2}(?:-[A-Za-z]+)?)\.md$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1])
    .sort();

  langCache.set(code, { data: languages, timestamp: Date.now() });
  return languages;
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
  // Use Contents API to list quiz directories (lightweight, no recursive tree)
  const contentsUrl = `https://api.github.com/repos/${BEC_OWNER}/${BEC_REPO}/contents/courses/${code}/quizz?ref=${BEC_BRANCH}`;
  const res = await fetch(contentsUrl, { headers: authHeaders(platform) });

  if (!res.ok) {
    if (res.status === 404) return []; // No quizz directory
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const entries: { name: string; type: string }[] = await res.json();

  // Find all question directories
  const questionDirs = new Set<string>();
  for (const entry of entries) {
    if (entry.type === 'dir') {
      questionDirs.add(`courses/${code}/quizz/${entry.name}`);
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

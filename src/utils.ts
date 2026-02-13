import { readFileSync, existsSync } from "fs";
import { resolve, extname } from "path";
import { execSync } from "child_process";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export function imageToBase64(filePath: string): string | null {
  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export function resolveImagePath(
  imgRef: string,
  courseDir: string,
  lang: string
): string | null {
  const cleaned = imgRef.replace(/^\.\//, "");

  const candidates = [
    resolve(courseDir, cleaned),
    resolve(courseDir, "assets", lang, cleaned),
    resolve(courseDir, "assets", cleaned),
    // If imgRef is like "assets/en/001.webp", try replacing lang
    resolve(courseDir, cleaned.replace(/assets\/\w+\//, `assets/${lang}/`)),
  ];

  // If it's just a filename, also check assets/{lang}/
  if (!cleaned.includes("/")) {
    candidates.push(resolve(courseDir, "assets", lang, cleaned));
  }

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export function getGitShortHash(repoPath: string): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export function formatCourseCode(code: string): string {
  // "btc101" -> "BTC 101"
  const match = code.match(/^([a-zA-Z]+)(\d+)$/);
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`;
  }
  return code.toUpperCase();
}

export function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    en: "English",
    fr: "Français",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ja: "日本語",
    ko: "한국어",
    ru: "Русский",
    "zh-Hans": "简体中文",
    "zh-Hant": "繁體中文",
    vi: "Tiếng Việt",
    cs: "Čeština",
    fi: "Suomi",
    et: "Eesti",
    id: "Bahasa Indonesia",
    pl: "Polski",
    hi: "हिन्दी",
    "sr-Latn": "Srpski",
    sv: "Svenska",
    nl: "Nederlands",
    "nb-NO": "Norsk Bokmål",
    tr: "Türkçe",
    fa: "فارسی",
    sw: "Kiswahili",
    rn: "Ikirundi",
    bg: "Български",
    th: "ไทย",
  };
  return names[langCode] || langCode;
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

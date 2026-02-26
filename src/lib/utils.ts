export function formatCourseCode(code: string): string {
  const match = code.match(/^([a-zA-Z]+)(\d+)$/);
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`;
  }
  return code.toUpperCase();
}

export function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ja: '日本語',
    ko: '한국어',
    ru: 'Русский',
    'zh-Hans': '简体中文',
    'zh-Hant': '繁體中文',
    vi: 'Tiếng Việt',
    cs: 'Čeština',
    fi: 'Suomi',
    et: 'Eesti',
    id: 'Bahasa Indonesia',
    pl: 'Polski',
    hi: 'हिन्दी',
    'sr-Latn': 'Srpski',
    sv: 'Svenska',
    nl: 'Nederlands',
    'nb-NO': 'Norsk Bokmål',
    tr: 'Türkçe',
    fa: 'فارسی',
    sw: 'Kiswahili',
    rn: 'Ikirundi',
    bg: 'Български',
    th: 'ไทย'
  };
  return names[langCode] || langCode;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

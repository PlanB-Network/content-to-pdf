/**
 * Safe environment variable access for both Node.js and edge runtimes
 */

export function getEnv(
  key: string,
  platform: App.Platform | undefined
): string | undefined {
  if (platform?.env) {
    const env = platform.env as Record<string, string | undefined>;
    const value = env[key];
    if (value) {
      return value.trim();
    }
    for (const k of Object.keys(env)) {
      if (k.trim() === key) {
        const v = env[k];
        if (v) return typeof v === 'string' ? v.trim() : undefined;
      }
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]?.trim();
  }

  return undefined;
}

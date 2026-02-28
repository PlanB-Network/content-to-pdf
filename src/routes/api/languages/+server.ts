import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { listCourseLanguages } from '$lib/server/github.js';

export const GET: RequestHandler = async ({ url, platform }) => {
  const code = url.searchParams.get('code');
  if (!code) return json({ error: 'Missing code parameter' }, { status: 400 });

  try {
    const languages = await listCourseLanguages(code, platform);
    return json(languages);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch languages';
    return json({ error: message }, { status: 500 });
  }
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { listCourses } from '$lib/server/github.js';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const courses = await listCourses(platform);
    return json(courses);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch courses';
    return json({ error: message }, { status: 500 });
  }
};

import type { PageServerLoad } from './$types.js';
import { listCourses } from '$lib/server/github.js';

export const load: PageServerLoad = async ({ platform }) => {
  try {
    const courses = await listCourses(platform);
    return { courses };
  } catch (e) {
    console.error('Failed to load courses:', e);
    return { courses: [], error: String(e) };
  }
};

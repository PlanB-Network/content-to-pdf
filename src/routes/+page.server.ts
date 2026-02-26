import type { PageServerLoad } from './$types.js';
import { listCourses } from '$lib/server/github.js';

export const load: PageServerLoad = async ({ platform }) => {
  const courses = await listCourses(platform);
  return { courses };
};

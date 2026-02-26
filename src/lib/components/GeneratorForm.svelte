<script lang="ts">
  import type { CourseInfo } from '$lib/types.js';

  interface Props {
    courses: CourseInfo[];
    loading: boolean;
    ongenerate: (params: {
      code: string;
      lang: string;
      mode: 'course' | 'quiz';
      count?: number;
      answers: boolean;
    }) => void;
  }

  let { courses, loading, ongenerate }: Props = $props();

  let selectedCode = $state('');
  let selectedLang = $state('');
  let mode = $state<'course' | 'quiz'>('course');
  let questionCount = $state('');
  let includeAnswers = $state(false);

  let availableLanguages = $derived(
    courses.find((c) => c.code === selectedCode)?.languages ?? []
  );

  // Reset language when course changes
  $effect(() => {
    if (selectedCode) {
      const langs = courses.find((c) => c.code === selectedCode)?.languages ?? [];
      if (!langs.includes(selectedLang)) {
        selectedLang = langs.includes('en') ? 'en' : langs[0] ?? '';
      }
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!selectedCode || !selectedLang) return;

    ongenerate({
      code: selectedCode,
      lang: selectedLang,
      mode,
      count: questionCount ? parseInt(questionCount) : undefined,
      answers: includeAnswers
    });
  }
</script>

<form onsubmit={handleSubmit} class="space-y-5">
  <!-- Course selector -->
  <div>
    <label for="course" class="mb-1 block text-sm font-semibold text-zinc-200">Course</label>
    <select
      id="course"
      bind:value={selectedCode}
      class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
    >
      <option value="">Select a course...</option>
      {#each courses as course}
        <option value={course.code}>{course.code}</option>
      {/each}
    </select>
  </div>

  <!-- Language selector -->
  <div>
    <label for="lang" class="mb-1 block text-sm font-semibold text-zinc-200">Language</label>
    <select
      id="lang"
      bind:value={selectedLang}
      disabled={!selectedCode}
      class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange disabled:opacity-50"
    >
      <option value="">Select a language...</option>
      {#each availableLanguages as lang}
        <option value={lang}>{lang}</option>
      {/each}
    </select>
  </div>

  <!-- Mode toggle -->
  <div>
    <span class="mb-2 block text-sm font-semibold text-zinc-200">Type</span>
    <div class="flex gap-4">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="mode"
          value="course"
          bind:group={mode}
          class="accent-planb-orange"
        />
        <span class="text-sm text-zinc-300">Course PDF</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="mode"
          value="quiz"
          bind:group={mode}
          class="accent-planb-orange"
        />
        <span class="text-sm text-zinc-300">Quiz PDF</span>
      </label>
    </div>
  </div>

  <!-- Quiz options -->
  {#if mode === 'quiz'}
    <div class="space-y-3 border-l-2 border-planb-orange/30 pl-4">
      <div>
        <label for="count" class="mb-1 block text-sm text-zinc-400">
          Question count <span class="text-zinc-500">(leave empty for all)</span>
        </label>
        <input
          id="count"
          type="number"
          min="1"
          bind:value={questionCount}
          placeholder="All questions"
          class="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
        />
      </div>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          bind:checked={includeAnswers}
          class="rounded border-zinc-600 bg-zinc-800 text-planb-orange accent-planb-orange focus:ring-planb-orange"
        />
        <span class="text-sm text-zinc-400">Include answer key</span>
      </label>
    </div>
  {/if}

  <!-- Generate button -->
  <button
    type="submit"
    disabled={!selectedCode || !selectedLang || loading}
    class="w-full rounded-lg bg-planb-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {#if loading}
      Generating...
    {:else}
      Generate PDF
    {/if}
  </button>
</form>

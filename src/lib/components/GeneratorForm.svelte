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
      presenterName?: string;
      presenterLogo?: string;
    }) => void;
  }

  let { courses, loading, ongenerate }: Props = $props();

  let filterLevel = $state('');
  let filterTopic = $state('');
  let selectedCode = $state('');
  let selectedLang = $state('');
  let mode = $state<'course' | 'quiz'>('course');
  let questionCount = $state('');
  let includeAnswers = $state(false);
  let presenterName = $state('');
  let presenterLogo = $state('');
  let availableLanguages = $state<string[]>([]);
  let loadingLangs = $state(false);

  function handleLogoFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      presenterLogo = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      presenterLogo = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Derive unique filter values from courses
  const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
  let levels = $derived(
    [...new Set(courses.map((c) => c.level).filter(Boolean))].sort(
      (a, b) => levelOrder.indexOf(a.toLowerCase()) - levelOrder.indexOf(b.toLowerCase()),
    ),
  );
  let topics = $derived([...new Set(courses.map((c) => c.topic).filter(Boolean))].sort());

  // Filtered courses based on selected filters
  let filteredCourses = $derived(
    courses.filter((c) => {
      if (filterLevel && c.level !== filterLevel) return false;
      if (filterTopic && c.topic !== filterTopic) return false;
      return true;
    })
  );

  // Fetch languages when course changes
  $effect(() => {
    if (selectedCode) {
      loadingLangs = true;
      selectedLang = '';
      fetch(`/api/languages?code=${encodeURIComponent(selectedCode)}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch languages (${res.status})`);
          return res.json();
        })
        .then((langs: string[]) => {
          availableLanguages = langs;
          selectedLang = langs.includes('en') ? 'en' : langs[0] ?? '';
        })
        .catch(() => {
          availableLanguages = [];
        })
        .finally(() => {
          loadingLangs = false;
        });
    } else {
      availableLanguages = [];
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
      answers: includeAnswers,
      presenterName: presenterName.trim() || undefined,
      presenterLogo: presenterLogo || undefined
    });
  }
</script>

<form onsubmit={handleSubmit} class="space-y-5">
  <!-- Filters -->
  <div class="flex gap-3">
    <div class="flex-1">
      <label for="filter-level" class="mb-1 block text-xs font-medium text-zinc-400">Level</label>
      <select
        id="filter-level"
        bind:value={filterLevel}
        onchange={() => {
          selectedCode = '';
        }}
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
      >
        <option value="">All levels</option>
        {#each levels as level}
          <option value={level}>{level}</option>
        {/each}
      </select>
    </div>
    <div class="flex-1">
      <label for="filter-topic" class="mb-1 block text-xs font-medium text-zinc-400">Topic</label>
      <select
        id="filter-topic"
        bind:value={filterTopic}
        onchange={() => {
          selectedCode = '';
        }}
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
      >
        <option value="">All topics</option>
        {#each topics as topic}
          <option value={topic}>{topic}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Course selector -->
  <div>
    <label for="course" class="mb-1 block text-sm font-semibold text-zinc-200">
      Course
      <span class="font-normal text-zinc-500">({filteredCourses.length})</span>
    </label>
    <select
      id="course"
      bind:value={selectedCode}
      class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
    >
      <option value="">Select a course...</option>
      {#each filteredCourses as course}
        <option value={course.code}>{course.code}{course.name ? ` — ${course.name}` : ''}</option>
      {/each}
    </select>
  </div>

  <!-- Language selector -->
  <div>
    <label for="lang" class="mb-1 block text-sm font-semibold text-zinc-200">Language</label>
    <select
      id="lang"
      bind:value={selectedLang}
      disabled={!selectedCode || loadingLangs}
      class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange disabled:opacity-50"
    >
      <option value="">{loadingLangs ? 'Loading languages...' : 'Select a language...'}</option>
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

  <!-- Instructor (optional) -->
  <div class="space-y-3">
    <span class="block text-sm font-semibold text-zinc-200">Instructor <span class="font-normal text-zinc-500">(optional)</span></span>
    <div>
      <label for="presenter-name" class="mb-1 block text-sm text-zinc-400">Name</label>
      <input
        id="presenter-name"
        type="text"
        bind:value={presenterName}
        placeholder="Your name or organization"
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
      />
    </div>
    <div>
      <label for="presenter-logo" class="mb-1 block text-sm text-zinc-400">Logo</label>
      <input
        id="presenter-logo"
        type="file"
        accept="image/*"
        onchange={handleLogoFile}
        class="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-200 hover:file:bg-zinc-600"
      />
    </div>
    {#if presenterLogo}
      <div class="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
        <img src={presenterLogo} alt="Logo preview" class="h-8 max-w-[80px] object-contain" />
        <button
          type="button"
          onclick={() => { presenterLogo = ''; }}
          class="text-xs text-zinc-500 hover:text-red-400"
        >&times; Remove</button>
      </div>
    {/if}
  </div>

  <!-- Generate button -->
  <button
    type="submit"
    disabled={!selectedCode || !selectedLang || loading}
    class="flex w-full items-center justify-center gap-2 rounded-lg bg-planb-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {#if loading}
      <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="opacity-75" />
      </svg>
      Generating...
    {:else}
      Generate PDF
    {/if}
  </button>
</form>

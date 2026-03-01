<script lang="ts">
  import type { CourseInfo, PdfType } from '$lib/types.js';

  interface Props {
    courses: CourseInfo[];
    loading: boolean;
    ongenerate: (params: {
      code: string;
      lang: string;
      type: PdfType;
      count?: number;
      presenterName?: string;
      presenterLogo?: string;
    }) => void;
  }

  let { courses, loading, ongenerate }: Props = $props();

  // Client-side course name resolution (avoids worker rate-limiting)
  const BEC_RAW = 'https://raw.githubusercontent.com/PlanB-Network/bitcoin-educational-content/dev';
  let courseNames = $state<Record<string, string>>({});
  const pendingNames = new Set<string>();

  function extractName(text: string): string {
    const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) return '';
    const n = m[1].match(/^name:\s*(.+)$/m);
    return n ? n[1].trim().replace(/^["']|["']$/g, '') : '';
  }

  $effect(() => {
    for (const c of courses) {
      if (c.name || courseNames[c.code] || pendingNames.has(c.code)) continue;
      pendingNames.add(c.code);
      fetch(`${BEC_RAW}/courses/${c.code}/en.md`)
        .then((r) => (r.ok ? r.text() : ''))
        .then((t) => {
          const n = extractName(t);
          if (n) courseNames[c.code] = n;
        })
        .catch(() => {});
    }
  });

  let filterLevel = $state('');
  let filterTopic = $state('');
  let selectedCode = $state('');
  let selectedLang = $state('');
  let selectedType = $state<PdfType>('course');
  let questionCount = $state('');
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

  let teacherGuideAvailable = $derived(selectedCode === 'btc101');

  // Reset type if teacher-guide is selected but course changes away from btc101
  $effect(() => {
    if (selectedType === 'teacher-guide' && !teacherGuideAvailable) {
      selectedType = 'course';
    }
  });

  let pdfTypes = $derived<{ type: PdfType; label: string; description: string; badge?: string; disabled?: boolean }[]>([
    {
      type: 'course',
      label: 'Course',
      description: 'Text and images only'
    },
    {
      type: 'course-full',
      label: 'Full Course',
      description: 'Tutorials, videos, resources, QR codes'
    },
    {
      type: 'quiz',
      label: 'Quiz',
      description: 'Randomized questions + answers'
    },
    {
      type: 'teacher-guide',
      label: 'Ready to Teach',
      description: teacherGuideAvailable
        ? 'Teacher guide with objectives and tips'
        : 'Only available for BTC 101',
      badge: 'BETA',
      disabled: !teacherGuideAvailable
    }
  ]);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!selectedCode || !selectedLang) return;

    ongenerate({
      code: selectedCode,
      lang: selectedLang,
      type: selectedType,
      count: questionCount ? parseInt(questionCount) : undefined,
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
        {@const displayName = course.name || courseNames[course.code] || ''}
        <option value={course.code}>{course.code}{displayName ? ` — ${displayName}` : ''}</option>
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

  <!-- PDF Type card picker -->
  <div>
    <span class="mb-2 block text-sm font-semibold text-zinc-200">What do you want to generate?</span>
    <div class="grid grid-cols-2 gap-2">
      {#each pdfTypes as card}
        <button
          type="button"
          disabled={card.disabled}
          onclick={() => { if (!card.disabled) selectedType = card.type; }}
          class="relative flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all {
            selectedType === card.type && !card.disabled
              ? 'border-planb-orange bg-planb-orange/10 ring-1 ring-planb-orange'
              : card.disabled
                ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/50 opacity-50'
                : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500'
          }"
        >
          {#if card.badge}
            <span class="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider {
              card.badge === 'BETA'
                ? 'bg-planb-orange/20 text-planb-orange'
                : 'bg-zinc-700/50 text-zinc-500'
            }">{card.badge}</span>
          {/if}
          <span class="text-sm font-semibold text-zinc-200">{card.label}</span>
          <span class="mt-0.5 text-xs text-zinc-400">{card.description}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Quiz options -->
  {#if selectedType === 'quiz'}
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
      <p class="text-xs text-zinc-500">
        Quizzes are randomized. Answers are always included at the end of the PDF.
        Print only the question pages to hand out to students.
      </p>
    </div>
  {/if}

  <!-- Instructor (optional) -->
  <div class="rounded-lg bg-zinc-800/40 border border-zinc-700/50 p-3">
    <span class="mb-2 block text-xs font-medium text-zinc-500">Instructor (optional)</span>
    <div class="flex gap-3">
      <div class="flex-1">
        <label for="presenter-name" class="mb-1 block text-xs font-medium text-zinc-400">Name</label>
        <input
          id="presenter-name"
          type="text"
          bind:value={presenterName}
          placeholder="Name or organization"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-500 focus:border-planb-orange focus:outline-none focus:ring-1 focus:ring-planb-orange"
        />
      </div>
      <div class="flex-1">
        <label for="presenter-logo" class="mb-1 block text-xs font-medium text-zinc-400">Logo <span class="text-zinc-600">(dark bg recommended)</span></label>
        <div class="flex items-center gap-2">
          {#if presenterLogo}
            <img src={presenterLogo} alt="Logo" class="h-[26px] max-w-[60px] object-contain" />
            <button
              type="button"
              onclick={() => { presenterLogo = ''; }}
              class="text-xs text-zinc-500 hover:text-red-400"
            >&times;</button>
          {/if}
          <input
            id="presenter-logo"
            type="file"
            accept="image/*"
            onchange={handleLogoFile}
            class="w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-600"
          />
        </div>
      </div>
    </div>
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

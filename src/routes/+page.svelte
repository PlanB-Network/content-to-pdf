<script lang="ts">
  import GeneratorForm from '$lib/components/GeneratorForm.svelte';
  import PdfPreview from '$lib/components/PdfPreview.svelte';
  import type { PageData } from './$types.js';

  let { data }: { data: PageData } = $props();

  let loading = $state(false);
  let error = $state('');
  let generatedHtml = $state('');
  let generatedTitle = $state('');
  let savedTitle = $state('');
  let showSuccess = $state(false);
  let bestPracticesOpen = $state(false);

  async function handleGenerate(params: {
    code: string;
    lang: string;
    mode: 'course' | 'quiz';
    count?: number;
    answers: boolean;
  }) {
    loading = true;
    error = '';
    generatedHtml = '';
    generatedTitle = '';
    showSuccess = false;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      generatedHtml = result.html;
      generatedTitle = result.title;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }
</script>

<div class="space-y-8">
  <!-- Generator form -->
  <div class="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
    <h2 class="mb-4 text-lg font-bold text-zinc-100">Generate PDF</h2>
    <GeneratorForm
      courses={data.courses}
      {loading}
      ongenerate={handleGenerate}
    />
  </div>

  <!-- Error -->
  {#if error}
    <div class="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
      {error}
    </div>
  {/if}

  <!-- Loading state -->
  {#if loading}
    <div class="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <div class="flex flex-col items-center justify-center py-16">
        <div class="mb-6 h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-700 border-t-planb-orange"></div>
        <p class="text-sm font-semibold text-zinc-200">Generating your PDF...</p>
        <p class="mt-1 text-xs text-zinc-500">Fetching content from GitHub and building the document</p>

        <!-- Skeleton preview -->
        <div class="mt-8 w-full max-w-md space-y-3">
          <div class="h-3 w-3/4 animate-pulse rounded bg-zinc-800"></div>
          <div class="h-3 w-full animate-pulse rounded bg-zinc-800"></div>
          <div class="h-3 w-5/6 animate-pulse rounded bg-zinc-800"></div>
          <div class="h-3 w-2/3 animate-pulse rounded bg-zinc-800"></div>
          <div class="mt-4 h-3 w-full animate-pulse rounded bg-zinc-800"></div>
          <div class="h-3 w-4/5 animate-pulse rounded bg-zinc-800"></div>
          <div class="h-3 w-3/4 animate-pulse rounded bg-zinc-800"></div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Preview -->
  {#if generatedHtml && !loading}
    <div class="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <PdfPreview html={generatedHtml} title={generatedTitle} onsaved={() => {
        savedTitle = generatedTitle;
        generatedHtml = '';
        generatedTitle = '';
        showSuccess = true;
      }} />
    </div>
  {/if}

  <!-- Success message -->
  {#if showSuccess && !loading}
    <div class="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-planb-orange/15">
          <svg class="h-7 w-7 text-planb-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-lg font-bold text-zinc-100">PDF saved!</h2>
        <p class="mt-1 text-sm text-zinc-400">
          <span class="font-medium text-zinc-300">{savedTitle}</span> is ready — enjoy teaching!
        </p>
        <button
          onclick={() => { showSuccess = false; }}
          class="mt-6 rounded-lg border border-zinc-600 px-5 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
        >
          Generate another PDF
        </button>
      </div>
    </div>
  {/if}

  <!-- Best Practices -->
  <div id="best-practices" class="rounded-xl border border-zinc-700 bg-zinc-900">
    <button
      onclick={() => bestPracticesOpen = !bestPracticesOpen}
      class="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-zinc-800/50 rounded-xl"
    >
      <span class="text-sm font-semibold text-zinc-200">Best Practices</span>
      <svg
        class="h-4 w-4 text-zinc-400 transition-transform duration-200 {bestPracticesOpen ? 'rotate-180' : ''}"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {#if bestPracticesOpen}
      <div class="border-t border-zinc-700 px-5 pb-5 pt-4 text-sm text-zinc-400 space-y-4">
        <div>
          <h3 class="mb-1 font-semibold text-zinc-200">Black text in corners?</h3>
          <p>
            When saving as PDF, your browser may print its own headers and footers
            (page title, URL, date, page number) as small black text in the page corners.
            This is not part of the generated document — it is added by the browser itself.
          </p>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-zinc-200">How to remove it</h3>
          <ol class="list-decimal space-y-1 pl-5">
            <li>In the print dialog, click <span class="font-medium text-zinc-300">More settings</span>.</li>
            <li>Uncheck <span class="font-medium text-zinc-300">Headers and footers</span>.</li>
            <li>Save as PDF as usual.</li>
          </ol>
          <p class="mt-2 text-zinc-500">
            Tip: When you choose "Save as PDF" as the destination (instead of a physical printer),
            most browsers disable headers and footers by default.
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>

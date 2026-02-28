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

      if (!res.ok) {
        let errorMsg = 'Generation failed';
        try {
          const body = await res.json();
          errorMsg = body.error || errorMsg;
        } catch {
          // Response body is not JSON (e.g. platform HTML error page)
        }
        throw new Error(errorMsg);
      }

      const result = await res.json();

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
</div>

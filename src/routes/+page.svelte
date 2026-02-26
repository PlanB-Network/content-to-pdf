<script lang="ts">
  import GeneratorForm from '$lib/components/GeneratorForm.svelte';
  import PdfPreview from '$lib/components/PdfPreview.svelte';
  import type { PageData } from './$types.js';

  let { data }: { data: PageData } = $props();

  let loading = $state(false);
  let error = $state('');
  let generatedHtml = $state('');
  let generatedTitle = $state('');

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

  <!-- Preview -->
  {#if generatedHtml}
    <div class="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <PdfPreview html={generatedHtml} title={generatedTitle} />
    </div>
  {/if}
</div>

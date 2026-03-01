<script>
  import '../app.css';
  import Nav from '$lib/components/Nav.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <title>Content to PDF - Plan B Network</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
  <Nav />
  <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
    {@render children()}
  </main>
  <footer class="sticky bottom-0 z-50 border-t border-zinc-700 bg-zinc-900 px-6 py-4">
    <div class="mx-auto flex max-w-4xl items-center justify-between text-sm text-zinc-500">
      <div class="flex items-center gap-4">
        <a
          href="https://github.com/PlanB-Network/content-to-pdf"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 transition-colors hover:text-zinc-300"
        >
          GitHub
          <svg class="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href="https://planb.academy"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 transition-colors hover:text-zinc-300"
        >
          Learn
          <svg class="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href="/best-practices"
          class="transition-colors hover:text-zinc-300"
        >
          Best Practices
        </a>
      </div>
      <div class="flex items-center gap-3">
        <a
          href="https://vibe.planb.network/PBN-global-tool-index.html"
          class="rounded-md border border-planb-orange/40 bg-planb-orange/10 px-3 py-1 text-xs font-medium text-planb-orange transition-colors hover:border-planb-orange/60 hover:bg-planb-orange/20"
        >
          Back to Global Tool Index
        </a>
        <span>
          <span class="font-semibold text-planb-orange">Plan B Network</span>
          <span class="ml-1 text-zinc-600">v{__APP_VERSION__}</span>
        </span>
      </div>
    </div>
  </footer>
</div>

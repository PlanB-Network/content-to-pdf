<script lang="ts">
  interface Props {
    html: string;
    title: string;
    onsaved?: () => void;
  }

  let { html, title, onsaved }: Props = $props();

  type ViewMode = 'single' | 'grid';
  let viewMode = $state<ViewMode>('single');
  let iframeEl: HTMLIFrameElement | undefined = $state();
  let pageCount = $state(0);

  function openPrintWindow() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to save as PDF.');
      return;
    }

    const overlayStyles = `
      @media screen {
        body > *:not(.print-overlay) { display: none !important; }
        .print-overlay {
          display: flex !important;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0a0a0a;
          color: #e4e4e7;
          font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 40px;
        }
        .print-overlay .logo {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #FF5C00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
        }
        .print-overlay h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #fafafa;
        }
        .print-overlay p {
          font-size: 14px;
          color: #a1a1aa;
          margin: 0 0 32px 0;
        }
        .print-overlay .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #27272a;
          border-top-color: #FF5C00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .print-overlay .hint {
          margin-top: 32px;
          font-size: 12px;
          color: #52525b;
        }
      }
      @media print {
        .print-overlay { display: none !important; }
      }
    `;

    const overlayHtml = `
      <div class="print-overlay">
        <div class="logo">P</div>
        <h1>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
        <p>Preparing your PDF — the save dialog should appear shortly.</p>
        <div class="spinner"></div>
        <div class="hint">Choose "Save as PDF" in the print dialog to download your file.</div>
      </div>
    `;

    const modifiedHtml = html.replace(
      '</head>',
      `<style>${overlayStyles}</style></head>`
    ).replace(
      '<body>',
      `<body>${overlayHtml}`
    );

    printWindow.document.write(modifiedHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        onsaved?.();
      }, 500);
    };
  }

  function setView(mode: ViewMode) {
    viewMode = mode;
    iframeEl?.contentWindow?.postMessage({ type: 'setViewMode', mode }, '*');
  }

  $effect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'pdfPreviewReady') {
        pageCount = e.data.pageCount;
        iframeEl?.contentWindow?.postMessage({ type: 'setViewMode', mode: viewMode }, '*');
      }
      if (e.data?.type === 'pdfViewModeChanged') {
        viewMode = e.data.mode;
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });

  // --- Preview CSS (screen only) ---
  const previewCss = `
    @media screen {
      html { background: #a1a1aa; }
      body {
        background: #a1a1aa !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: auto !important;
      }

      .pdf-page {
        width: 794px;
        height: 1123px;
        background: white;
        padding: 38px 76px;
        box-sizing: border-box;
        overflow: hidden;
      }

      .pdf-page .cover-page,
      .pdf-page .final-page {
        min-height: 0 !important;
      }

      .pdf-page-wrapper {
        position: relative;
      }

      /* --- Single view --- */
      body.view-single {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        padding: 24px 0 !important;
      }
      body.view-single .pdf-page {
        box-shadow: 0 2px 16px rgba(0,0,0,0.3);
      }
      body.view-single .pdf-page-wrapper::after {
        content: attr(data-page) ' / ' attr(data-total);
        display: block;
        text-align: center;
        padding: 6px;
        font-size: 11px;
        color: #71717a;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }

      /* --- Grid view --- */
      body.view-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 16px;
        padding: 20px !important;
      }
      body.view-grid .pdf-page-wrapper {
        width: 260px;
        height: 368px;
        overflow: hidden;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        cursor: pointer;
      }
      body.view-grid .pdf-page {
        transform: scale(0.3274);
        transform-origin: top left;
      }
      body.view-grid .pdf-page-wrapper::after {
        content: attr(data-page);
        position: absolute;
        bottom: 6px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        color: white;
        background: rgba(0,0,0,0.5);
        padding: 2px 10px;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        pointer-events: none;
      }

      /* Scrollbar */
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #a1a1aa; }
      ::-webkit-scrollbar-thumb { background: #71717a; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #52525b; }
    }
  `;

  // --- Pagination script (runs inside iframe) ---
  const previewScript = `
    (function() {
      var PAGE_W = 794;
      var PAGE_H = 1123;
      var PAD_X = 76;
      var PAD_Y = 38;
      var CONTENT_H = PAGE_H - PAD_Y * 2;
      var CONTENT_W = PAGE_W - PAD_X * 2;

      var BREAK_BEFORE = ['part-header', 'chapter-header', 'final-page', 'answer-key'];
      var BREAK_AFTER = ['cover-page', 'toc-page'];

      function hasBreakBefore(el) {
        if (!el.classList) return false;
        for (var i = 0; i < BREAK_BEFORE.length; i++) {
          if (el.classList.contains(BREAK_BEFORE[i])) return true;
        }
        return false;
      }

      function hasBreakAfter(el) {
        if (!el.classList) return false;
        for (var i = 0; i < BREAK_AFTER.length; i++) {
          if (el.classList.contains(BREAK_AFTER[i])) return true;
        }
        return false;
      }

      function paginate() {
        var els = [];
        var children = document.body.children;
        for (var i = 0; i < children.length; i++) {
          var tag = children[i].tagName;
          if (tag !== 'SCRIPT' && tag !== 'STYLE') {
            els.push(children[i]);
          }
        }
        if (els.length === 0) return;

        for (var i = 0; i < els.length; i++) els[i].remove();

        var measure = document.createElement('div');
        measure.style.cssText = 'width:' + CONTENT_W + 'px;position:absolute;left:-9999px;top:0;visibility:hidden;padding:0;margin:0;';
        document.body.appendChild(measure);

        var pages = [];
        var curPage = [];
        var curH = 0;

        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          var breakBefore = hasBreakBefore(el);
          var breakAfter = hasBreakAfter(el);

          if (breakBefore && curPage.length > 0) {
            pages.push(curPage);
            curPage = [];
            curH = 0;
          }

          measure.appendChild(el);
          var h = el.offsetHeight;
          measure.removeChild(el);

          if (curH > 0 && curH + h > CONTENT_H) {
            pages.push(curPage);
            curPage = [];
            curH = 0;
          }

          curPage.push(el);
          curH += h;

          if (breakAfter) {
            pages.push(curPage);
            curPage = [];
            curH = 0;
          }
        }

        if (curPage.length > 0) pages.push(curPage);
        measure.remove();

        var total = pages.length;
        for (var i = 0; i < total; i++) {
          var wrapper = document.createElement('div');
          wrapper.className = 'pdf-page-wrapper';
          wrapper.setAttribute('data-page', String(i + 1));
          wrapper.setAttribute('data-total', String(total));
          var page = document.createElement('div');
          page.className = 'pdf-page';
          for (var j = 0; j < pages[i].length; j++) {
            page.appendChild(pages[i][j]);
          }
          wrapper.appendChild(page);
          document.body.appendChild(wrapper);
        }

        document.body.classList.add('view-single');
        window.parent.postMessage({ type: 'pdfPreviewReady', pageCount: total }, '*');
      }

      // Click page in grid → switch to single and scroll to it
      document.body.addEventListener('click', function(e) {
        if (!document.body.classList.contains('view-grid')) return;
        var wrapper = e.target.closest('.pdf-page-wrapper');
        if (!wrapper) return;
        document.body.classList.remove('view-grid');
        document.body.classList.add('view-single');
        setTimeout(function() {
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        window.parent.postMessage({ type: 'pdfViewModeChanged', mode: 'single' }, '*');
      });

      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'setViewMode') {
          document.body.classList.remove('view-single', 'view-grid');
          document.body.classList.add('view-' + e.data.mode);
        }
      });

      if (document.readyState === 'complete') {
        paginate();
      } else {
        window.addEventListener('load', paginate);
      }
    })();
  `;

  // Build preview HTML with pagination injected
  let previewHtml = $derived.by(() => {
    const closeTag = '</' + 'script>';
    return html
      .replace('</head>', `<style>${previewCss}</style></head>`)
      .replace('</body>', `<script>${previewScript}${closeTag}</body>`);
  });
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h2 class="text-sm font-semibold text-zinc-200">Preview: {title}</h2>
      {#if pageCount > 0}
        <span class="text-xs text-zinc-500">{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <!-- View mode toggle -->
      <div class="flex overflow-hidden rounded-lg border border-zinc-700">
        <button
          onclick={() => setView('single')}
          class="px-2.5 py-1.5 transition-colors {viewMode === 'single' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
          title="Single page view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="1.5" width="10" height="13" rx="1" />
            <line x1="5.5" y1="5" x2="10.5" y2="5" />
            <line x1="5.5" y1="7.5" x2="10.5" y2="7.5" />
            <line x1="5.5" y1="10" x2="8.5" y2="10" />
          </svg>
        </button>
        <button
          onclick={() => setView('grid')}
          class="px-2.5 py-1.5 transition-colors {viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
          title="Grid view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1.5" y="1.5" width="5" height="6" rx="0.75" />
            <rect x="9.5" y="1.5" width="5" height="6" rx="0.75" />
            <rect x="1.5" y="10" width="5" height="4.5" rx="0.75" />
            <rect x="9.5" y="10" width="5" height="4.5" rx="0.75" />
          </svg>
        </button>
      </div>

      <button
        onclick={openPrintWindow}
        class="rounded-lg bg-planb-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e65200]"
      >
        Save as PDF
      </button>
    </div>
  </div>

  <div class="overflow-hidden rounded-lg border border-zinc-700">
    <iframe
      bind:this={iframeEl}
      srcdoc={previewHtml}
      {title}
      class="block w-full border-0"
      style="height: 70vh;"
    ></iframe>
  </div>
</div>

<script lang="ts">
  interface Props {
    html: string;
    title: string;
  }

  let { html, title }: Props = $props();

  function openPrintWindow() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to save as PDF.');
      return;
    }

    // Inject a screen-only overlay so the tab looks clean while print dialog loads
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

    // Parse the HTML and inject overlay + styles
    const overlayHtml = `
      <div class="print-overlay">
        <div class="logo">P</div>
        <h1>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
        <p>Preparing your PDF — the save dialog should appear shortly.</p>
        <div class="spinner"></div>
        <div class="hint">Choose "Save as PDF" in the print dialog to download your file.</div>
      </div>
    `;

    // Inject overlay styles and element into the HTML
    const modifiedHtml = html.replace(
      '</head>',
      `<style>${overlayStyles}</style></head>`
    ).replace(
      '<body>',
      `<body>${overlayHtml}`
    );

    printWindow.document.write(modifiedHtml);
    printWindow.document.close();

    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold text-zinc-200">Preview: {title}</h2>
    <button
      onclick={openPrintWindow}
      class="rounded-lg bg-planb-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e65200]"
    >
      Save as PDF
    </button>
  </div>

  <div class="overflow-hidden rounded-lg border border-zinc-700 bg-white shadow-sm">
    <iframe
      srcdoc={html}
      {title}
      class="w-full border-0"
      style="height: 600px;"
    ></iframe>
  </div>
</div>

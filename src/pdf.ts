import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname } from "path";

export interface PdfFooter {
  versionText: string;
  logoBase64: string;
}

export async function generatePdf(
  html: string,
  outputPath: string,
  footer?: PdfFooter
): Promise<void> {
  mkdirSync(dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });

    const pdfOptions: Parameters<typeof page.pdf>[0] = {
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "18mm", left: "15mm", right: "15mm" },
    };

    if (footer) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = '<span></span>';
      pdfOptions.footerTemplate = `
        <div style="width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; align-items: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          <span style="font-size: 7pt; color: #aaa;">${footer.versionText}</span>
          ${footer.logoBase64 ? `<img src="${footer.logoBase64}" style="height: 14px;">` : ""}
        </div>
      `;
    }

    await page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
}

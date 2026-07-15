#!/usr/bin/env node
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function collectHtmlFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(full, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const PRINT_CSS = `
  img { max-width: 100% !important; height: auto !important; }
  table { width: 100% !important; table-layout: fixed !important; word-break: break-word; }
  td, th { overflow-wrap: break-word; }
  table, tr, img, pre, code, figure, .callout, [class*="block"] {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
  .notion-topbar, .notion-sidebar, .notion-overlay-container { display: none !important; }
  body { margin: 0; padding: 0; }
`;

(async () => {
  const [,, sourceDir, outputDir] = process.argv;

  if (!sourceDir || !outputDir) {
    process.stderr.write('Usage: node convert.js <sourceDir> <outputDir>\n');
    process.exit(1);
  }

  const absSource = path.resolve(sourceDir);
  const absOutput = path.resolve(outputDir);

  if (!fs.existsSync(absSource)) {
    process.stderr.write(`Source directory not found: ${absSource}\n`);
    process.exit(1);
  }

  const htmlFiles = collectHtmlFiles(absSource);
  const total = htmlFiles.length;

  if (total === 0) {
    emit({ type: 'done', converted: 0, skipped: 0, errors: 0, message: 'No HTML files found.' });
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  let converted = 0;
  let errors = 0;

  for (let i = 0; i < htmlFiles.length; i++) {
    const htmlPath = htmlFiles[i];
    const relPath = path.relative(absSource, htmlPath);
    const pdfRel = relPath.replace(/\.html$/i, '.pdf');
    const pdfPath = path.join(absOutput, pdfRel);

    emit({ type: 'progress', current: i + 1, total, file: relPath });

    try {
      fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
      const fileUrl = 'file://' + htmlPath;
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.addStyleTag({ content: PRINT_CSS });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      converted++;
    } catch (err) {
      errors++;
      emit({ type: 'error', file: relPath, message: err.message });
    }
  }

  await browser.close();
  emit({ type: 'done', converted, skipped: 0, errors });
})();
````markdown
# test-puppeteer-pdf.js Documentation

## Purpose

This test validates that a Puppeteer-driven PDF generation flow creates a PDF file on disk and returns a buffer. It's a functional verification of the `page.pdf()` call and file handling around it.

## Running locally

```bash
cd server
npm run test:run -- test-puppeteer-pdf.js
```

CI notes

- Requires system Chrome/Chromium or a bundled Chromium accessible to Puppeteer.
````

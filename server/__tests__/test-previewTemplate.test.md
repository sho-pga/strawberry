````markdown
# test-previewTemplate.js Documentation

## Purpose

This test validates the `previewTemplate` helper (server-side HTML template used for PDF generation and preview endpoints).

It ensures the template accepts content objects and returns valid HTML (title and body present).

## Running locally

```bash
cd server
npm run test:run -- test-previewTemplate.js
```

Notes

- This is a unit-level test; it does not require Puppeteer.
````

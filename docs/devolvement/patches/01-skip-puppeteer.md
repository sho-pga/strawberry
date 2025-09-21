Title: Skip Puppeteer (gate with SKIP_PUPPETEER / DEV_MINIMAL)

Purpose

- Provide a minimal, reversible change that prevents Puppeteer from starting in devolved branches.

Suggested change (example snippet for `server/index.js`)

```js
async function startPuppeteer() {
  if (process.env.SKIP_PUPPETEER === "1" || process.env.DEV_MINIMAL === "1") {
    console.log("SKIP_PUPPETEER enabled — returning stubbed renderer");
    return null;
  }
  const browser = await puppeteer.launch({ args: CHROME_ARGS });
  return browser;
}
```

Notes

- Keep the API compatible: when `startPuppeteer()` returns `null`, ensure any consumer checks for `null` and uses a stubbed renderer function that returns a minimal HTML or text payload.
- Prefer gating over deleting code so the full implementation remains available for restoration.

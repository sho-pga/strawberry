# Quick-Build Strategy to Complete Core Loop

## Purpose

This section outlines the simplified implementation strategy to complete the core loop: Prompt -> AI Processing -> Preview -> Basic Override -> PDF Export.

- Create `api.js` with retry logic
- Components
- Integration
- Basic infrastructure is stable
- Prompt handling is working
- Error handling and retry logic implemented

## Implementation Plan

### Day 1: AI Mock & Preview ✓

#### Morning: Simple AI Service

```javascript
class SimpleAIService {
  async generateContent(prompt) {
    return {
      content: {
        title: `Generated from: ${prompt}`,
        body: `This is a simple response to demonstrate the flow.
               Later we can integrate real AI here.
               For now, we're testing the core loop.`,
        layout: "default",
      },
      metadata: {
        model: "mock-1",
        tokens: prompt.split(" ").length,
      },
    };
  }
}
```

#### Afternoon: Preview System

```javascript
const previewTemplate = (content) => `
  <div class="preview">
    <h1>${content.title}</h1>
    <div class="content">${content.body}</div>
  </div>
`;

app.get("/preview", (req, res) => {
  const { content } = req.query;
  res.send(previewTemplate(JSON.parse(content)));
});
```

### Day 2: Override & Export ✓

#### Morning: Basic Override

```javascript
// Simple content update endpoint
app.post("/override", (req, res) => {
  const { content, changes } = req.body;
  const updated = { ...content, ...changes };
  res.json({ content: updated });
});
```

#### Afternoon: PDF Export

```javascript
const puppeteer = require("puppeteer");

app.get("/export", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(previewTemplate(req.query.content));
  const pdf = await page.pdf({ format: "A4" });
  await browser.close();
  res.setHeader("Content-Type", "application/pdf");
  res.end(pdf); // Use res.end() for binary data
});
```

### Day 3: Frontend Integration ✓

#### Morning: API Layer Implementation

1. **Create API Utilities Structure**:

```javascript
// client/src/lib/api.js
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 10000,
  retryableStatuses: [401, 408, 429, 500, 502, 503, 504],
};

class APILogger {
  static log(endpoint, status, attempt, error = null) {
    console.log(
      `[${new Date().toISOString()}] ${endpoint} - Status: ${status}, Attempt: ${attempt}${
        error ? `, Error: ${error.message}` : ""
      }`
    );
    // Can be enhanced for Day 4 testing with more structured logging
  }
}

export const api = {
  async fetchWithRetry(endpoint, options = {}, config = DEFAULT_CONFIG) {
    let attempt = 1;
    while (attempt <= config.maxRetries) {
      try {
        const response = await fetch(endpoint, options);
        APILogger.log(endpoint, response.status, attempt);

        if (
          !response.ok &&
          config.retryableStatuses.includes(response.status)
        ) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch (error) {
        APILogger.log(endpoint, "ERROR", attempt, error);
        if (attempt === config.maxRetries) throw error;

        const backoff = Math.min(
          config.initialBackoffMs * Math.pow(2, attempt - 1),
          config.maxBackoffMs
        );
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
      }
    }
  },
};
```

2. **Endpoint Wrappers**:

```javascript
// client/src/lib/endpoints.js
import { api } from "./api";

export const endpoints = {
  async preview(content) {
    const response = await api.fetchWithRetry(
      `/preview?content=${encodeURIComponent(JSON.stringify(content))}`
    );
    return response.text();
  },

  async override(content, changes) {
    const response = await api.fetchWithRetry("/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, changes }),
    });
    return response.json();
  },

  async export(content) {
    const response = await api.fetchWithRetry(
      `/export?content=${encodeURIComponent(JSON.stringify(content))}`,
      { responseType: "blob" }
    );
    return response.blob();
  },
};
```

#### Afternoon: Component Integration

1. **Core Components**:

```javascript
// Preview.svelte
<script>
  import { endpoints } from '../lib/endpoints';
  import { onMount } from 'svelte';

  export let content;
  let previewHtml = '';
  let loading = false;
  let error = null;

  async function loadPreview() {
    try {
      loading = true;
      previewHtml = await endpoints.preview(content);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(loadPreview);
</script>

{#if loading}
  <div class="loading">Loading preview...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  {@html previewHtml}
{/if}
```

2. **Implementation Checklist**:

- [x] API Layer
  - [x] Create `api.js` with retry logic
  - [x] Implement `APILogger` for status tracking
  - [x] Set up endpoint wrappers

- [x] Components
  - [x] Preview component with error boundaries
  - [x] Editor component with validation
  - [x] Export component with progress tracking

- [x] Integration
  - [x] Connect components through store/state management
  - [x] Implement loading states
  - [x] Add error recovery UX
  - [x] Test cross-component communication

3. **Testing Focus Points**:
   - API retry mechanism
   - Error boundary effectiveness
   - State consistency across components
   - Loading state transitions
   - Logger output for Day 4 analysis

### Day 4: Polish & Test

#### Morning: Core Flow Testing

- Test each step in sequence
- Verify data flow
- Check error cases

#### Afternoon: Documentation & Cleanup

- Document usage
- Clean up code
- Prepare for demo

## Quick-Build Principles

1. **Simplicity First**

   - Start with minimal implementation
   - Focus on core functionality
   - Avoid premature optimization

2. **Rapid Iteration**

   - Get basic flow working
   - Test and fix issues
   - Then enhance features

3. **Pragmatic Choices**
   - Use synchronous flows initially
   - Minimal but effective error handling
   - Focus on completion over perfection

## Success Criteria

- Complete core loop working end-to-end
- Basic error handling in place
- Simple but functional UI
- PDF export capability demonstrated

## Next Steps After Quick-Build

- Enhance AI service with real integration
- Improve preview templates
- Add advanced PDF options
- Expand error handling

Remember: The goal is a working prototype that demonstrates the full flow. We can enhance individual components after proving the concept works.

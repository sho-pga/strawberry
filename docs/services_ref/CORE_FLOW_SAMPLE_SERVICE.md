# CORE_FLOW_SAMPLE_SERVICE — Evolution to First Service Implementation

[THU 18th Sep 2025 @ 10:45AM]

Reference:

- [CORE_FLOW_SPEC.md](CORE_FLOW_SPEC.md) - The initial working flow
- [CURRENT_SERVICE_AGNOSTIC.md](CURRENT_SERVICE_AGNOSTIC.md) - The target service architecture

## Evolution Path

### Phase 1: Working Basic Flow (Current)

```
Frontend → POST /prompt → Backend → text file → 3x content → Preview
```

This is our "Hello World" - minimal but proves connectivity works.

### Phase 2: Service Wrapper

```
Frontend → POST /prompt → Backend → sampleService.generate() → text file → 3x content → Preview
```

Wrap current functionality in a service interface.

### Phase 3: Service Abstraction

```
Frontend → POST /prompt → Backend → genieService → sampleService → text file → 3x content → Preview
```

Add service abstraction layer, making sampleService the first implementation.

### Phase 4: Full Contract (Final)

```
                   genieServiceFE
                         ↓
Frontend → POST /prompt → Backend → genieService → [any service] → storage → response → Preview
                                        ↓
                                   sampleService
                                   (reference impl)
```

## Service Implementation Flow

```
+------------------+     (1) POST /prompt      +-----------------+
|     Frontend     |----------------------->   |  genieService   |
|                  |    {"prompt": "..."}     |                 |
|                  |                          |    delegates    |
|                  |                          |       to        |
|                  |                          |       ↓        |
|                  |                          | sampleService   |
|                  |    (2) Response          |     writes     |
|                  |    <---------------      |   prompt.txt    |
|                  |    3x Content           |   & returns     |
+------------------+                          +-----------------+

Implementation Path:
1. Frontend → POST /prompt → server/index.js
2. index.js → genieService.generate(prompt)
3. genieService → sampleService.generate(prompt)
4. sampleService:
   - Writes to latest_prompt.txt
   - Returns tripled content
5. Response flows back through chain
```

## Implementation Evolution

### 1. Current Basic Flow

- Direct endpoint handling
- Simple file write
- Basic string triplication
- Minimal error handling

### 2. Service Interface

```javascript
// sampleService.js
export const generate = async (prompt) => {
  await writeToFile(prompt);
  return tripleContent(prompt);
};
```

### 3. Service Abstraction

```javascript
// genieService.js
export const generate = async (prompt) => {
  // Will support multiple services
  return sampleService.generate(prompt);
};
```

### 4. Full Contract

````typescript
interface ServiceResponse {
  content: string;
  promptId?: string;
  metadata?: object;
}

interface ServiceContract {
  generate(prompt: string): Promise<ServiceResponse>;
  // Future methods as needed
}

2. Service Contract

   - Input: `{ prompt: string }`
   - Output: `{ content: string }` (tripled content)
   - Side effect: writes to `latest_prompt.txt`

3. Integration Points
   - Entry: `server/index.js` POST /prompt handler
   - Service: `sampleService.generate()`
   - Abstraction: `genieService.generate()`

## Testing Flow

1. Manual Test

   ```bash
   curl -X POST http://localhost:3000/prompt \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test"}'
````

2. Expected Results
   - File: `latest_prompt.txt` contains "test"
   - Response: "test\ntest\ntest"
   - Preview: Shows three lines of "test"

## Future Expansion

This minimal implementation provides the foundation for:

- Service abstraction through genieService
- Basic file-based persistence pattern
- Simple content transformation (triplication)

The core flow will be enhanced per RESTORATION_SPEC.md while maintaining this basic service structure.

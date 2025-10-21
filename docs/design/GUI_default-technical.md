# GUI Default Mode - Technical Specification

## Component Architecture

### Structure Overview

```
ModeSelector/            # Mode selection menu component
├── ModeOption.svelte    # Individual mode option
└── ModeMenu.svelte      # Container for mode options

ModeContent/             # Content area component
├── DefaultMode/         # Default mode implementation
│   ├── PromptInput.svelte
│   └── GenerateButton.svelte
└── future modes...      # Placeholder for future implementations
```

## Mode Management Infrastructure

### State Management

```typescript
interface ModeState {
  current: "default" | "demo" | string; // extensible for future modes
  previousMode?: string; // for returning to previous mode
  timestamp: number; // when mode was last changed
  params?: Record<string, unknown>; // mode-specific parameters
}

interface DefaultModeParams {
  promptType: "basic";
  outputType: "book";
  validation: "standard";
}
```

### Component Structure

#### 1. Mode Indicator Component

```typescript
// ModeIndicator.svelte
interface ModeIndicatorProps {
  mode: string;
  label: string;
  isActive: boolean;
  canRevert: boolean;
}
```

#### 2. Store Definition

```typescript
// stores/modeStore.js
const createModeStore = () => {
  const { subscribe, set, update } = writable<ModeState>({
    current: "default",
    timestamp: Date.now(),
    params: {
      promptType: "basic",
      outputType: "book",
      validation: "standard",
    },
  });

  return {
    subscribe,
    setMode: (mode: string, params?: Record<string, unknown>) =>
      update((state) => ({
        ...state,
        previousMode: state.current,
        current: mode,
        timestamp: Date.now(),
        params,
      })),
    revertToDefault: () =>
      update((state) => ({
        current: "default",
        timestamp: Date.now(),
        params: {
          promptType: "basic",
          outputType: "book",
          validation: "standard",
        },
      })),
  };
};
```

## Implementation Details

### 1. Mode Indicator Integration

```svelte
<!-- App.svelte partial -->
<script>
  import { modeStore } from './stores/modeStore';
  import ModeIndicator from './components/ModeIndicator.svelte';
</script>

<section>
  <h2>AI-Powered eBook Creation</h2>
  <ModeIndicator
    mode={$modeStore.current}
    label={$modeStore.current === 'default' ? 'Basic Prompt → Book' : ''}
    isActive={true}
    canRevert={$modeStore.current !== 'default'}
  />
  <!-- existing prompt form -->
</section>
```

### 2. CSS Styling

```css
.mode-indicator {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 0.5rem 0;
  padding: 0.75rem;
  font-size: 0.9rem;
  color: #666;
  transition: background-color 0.2s ease;
}

.mode-indicator.default {
  background: #fafafa;
  border-style: dashed;
}

.mode-indicator:hover {
  background: #f0f0f0;
}
```

### 3. Mode-Specific Behavior

#### Default Mode Handler

```typescript
// handlers/defaultMode.ts
export class DefaultModeHandler {
  validate(prompt: string): ValidationResult {
    return {
      isValid: prompt.length > 0,
      message: prompt.length > 0 ? "Valid" : "Prompt required",
    };
  }

  process(prompt: string): Promise<ProcessingResult> {
    return this.standardProcessing(prompt);
  }

  private standardProcessing(prompt: string): Promise<ProcessingResult> {
    // Implementation of default processing logic
  }
}
```

## API Integration

### 1. Request/Response Structure

```typescript
interface DefaultModeRequest {
  mode: "default";
  prompt: string;
  params: DefaultModeParams;
}

interface DefaultModeResponse {
  status: "success" | "error";
  result?: {
    content: string;
    metadata: {
      processingTime: number;
      wordCount: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### 2. Mode-Aware Service Calls

```typescript
// services/promptService.ts
export class PromptService {
  async submit(
    prompt: string,
    mode: string = "default"
  ): Promise<ProcessingResult> {
    const request: DefaultModeRequest = {
      mode,
      prompt,
      params: {
        promptType: "basic",
        outputType: "book",
        validation: "standard",
      },
    };

    const response = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    return response.json();
  }
}
```

## Testing Considerations

### 1. Unit Tests

```typescript
// Tests for mode management
describe("Mode Management", () => {
  test("defaults to basic mode", () => {
    const store = createModeStore();
    expect(store.current).toBe("default");
  });

  test("maintains mode parameters", () => {
    const store = createModeStore();
    expect(store.params).toHaveProperty("promptType", "basic");
  });
});
```

### 2. Integration Tests

```typescript
describe("Default Mode Integration", () => {
  test("processes prompt with default parameters", async () => {
    const service = new PromptService();
    const result = await service.submit("test prompt");
    expect(result.status).toBe("success");
  });
});
```

## Migration Strategy

### Phase 1: Mode Infrastructure

1. Implement mode store
2. Add ModeIndicator component
3. Update App.svelte layout
4. Add default mode handler

### Phase 2: API Integration

1. Update API endpoints for mode awareness
2. Implement mode-specific validation
3. Add mode-specific response handling

### Phase 3: Testing & Validation

1. Unit test coverage
2. Integration test suite
3. UI/UX validation
4. Performance testing

## Future Considerations

### Mode Extension Points

- Mode registration system
- Mode-specific component injection
- Custom validation rules
- Mode-specific API handlers

### Performance Optimization

- Mode switching optimization
- Lazy loading of mode-specific code
- Caching strategies for mode data

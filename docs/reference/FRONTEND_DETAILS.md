# AetherPress Frontend Detailed Component Description

## Core Components

### 1. PromptInput

The primary interface for user input and content generation.

#### Key Components

- Text input area
- Generation controls
- Validation system
- Loading indicators

#### Behavior

- Accepts user input
- Validates content
- Triggers generation
- Shows loading states
- Handles errors

### 2. PreviewWindow

Displays real-time preview of generated content.

#### Key Components

- Preview renderer
- Image handling
- Layout system
- Update mechanism

#### Behavior

- Renders HTML content
- Updates in real-time
- Handles image loading
- Manages layout
- Scales content

### 3. OverrideControls

Provides content modification capabilities.

#### Key Components

- Edit interface
- Version tracking
- Content validation
- Update system

#### Behavior

- Enables content editing
- Tracks changes
- Validates modifications
- Updates preview
- Manages history

### 4. ExportButton

Manages PDF generation and download.

#### Key Components

- Export trigger
- Progress tracking
- Download handling
- Error management

#### Behavior

- Initiates export
- Shows progress
- Handles download
- Manages errors
- Updates status

### 5. StatusDisplay

Provides system status and feedback.

#### Key Components

- Status messages
- Error display
- Progress indicators
- Toast notifications

#### Behavior

- Shows system state
- Displays errors
- Indicates progress
- Times out messages

## State Management

### Stores

The application uses Svelte stores for state management.

#### promptStore

```javascript
{
  text: string,
  options: {
    enhance: boolean,
    format: string
  },
  history: string[]
}
```

#### contentStore

```javascript
{
  title: string,
  content: string,
  metadata: object,
  version: number
}
```

#### uiStateStore

```javascript
{
  loading: boolean,
  error: string|null,
  progress: number,
  status: string
}
```

#### previewStore

```javascript
{
  html: string,
  images: string[],
  style: object
}
```

## API Integration

### Endpoints

#### POST /api/prompt

Content generation request.

```javascript
{
  prompt: string,
  options: {
    enhance: boolean,
    format: string
  }
}
```

#### GET /api/preview

Preview content request.

- Query params: contentId, version
- Returns: HTML content

#### POST /api/export

Export generation request.

```javascript
{
  content: {
    title: string,
    body: string
  },
  options: {
    format: string,
    quality: string
  }
}
```

### Error Handling

```javascript
try {
  // API call
} catch (error) {
  uiStateStore.update((state) => ({
    ...state,
    error: error.message,
  }));
}
```

## Component Events

### Event Types

1. User Input Events
2. Generation Events
3. Preview Events
4. Export Events
5. Status Events

### Event Handling

```javascript
function handleEvent(event) {
  // Update stores
  // Trigger API calls
  // Update UI state
}
```

## Styling System

### CSS Structure

```css
/* Global Styles */
:root {
  --primary-color: #007bff;
  --error-color: #dc3545;
  --success-color: #28a745;
}

/* Component Styles */
.component {
  /* Component-specific styles */
}

/* Layout Styles */
.container {
  /* Layout-specific styles */
}
```

### Theme System

- Light/Dark mode support
- Customizable colors
- Responsive design
- Accessibility features

## Development Tools

### Testing

- Component testing
- Store testing
- Event testing
- Integration testing

### Debugging

- Store inspector
- Component inspector
- Network monitor
- Error tracking

### Build Process

```bash
# Development
npm run dev

# Production
npm run build
npm run preview
```

## Configuration

### Vite Config

```javascript
export default {
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
};
```

### Svelte Config

```javascript
export default {
  compilerOptions: {
    dev: !production,
  },
  preprocess: vitePreprocess(),
};
```

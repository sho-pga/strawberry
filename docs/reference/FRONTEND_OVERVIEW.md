# AetherPress Frontend Overview

## Core Architecture

AetherPress's frontend is built as a Svelte Single Page Application (SPA) with the following key components:

1. **Application Core**

   - Svelte/Vite framework
   - Component-based architecture
   - State management via Svelte stores
   - Modern ES modules system

2. **Core Components**

   - Prompt Input System
   - Preview Window
   - Override Controls
   - Export Management
   - Status Display

3. **State Management**
   - Prompt store
   - Content store
   - UI state store
   - Preview store

## Key Features

### 1. User Interface

- Intuitive prompt input
- Real-time preview
- Content override capabilities
- Export controls
- Status feedback

### 2. State Management

- Centralized store system
- Reactive updates
- Persistent state
- Error handling

### 3. API Integration

- Backend communication
- Progress tracking
- Error handling
- Response processing

### 4. Preview System

- Real-time updates
- Dynamic styling
- Image handling
- Layout management

### 5. Export System

- PDF generation triggers
- Progress monitoring
- Download management
- Error handling

## Infrastructure

### Environment

- Vite development server
- ES modules
- Hot Module Replacement
- Development tools

### Configuration

- Svelte configuration
- Vite settings
- Build options
- Proxy setup

### Development Tools

- Vitest for testing
- ESLint for linting
- Prettier for formatting
- Browser DevTools support

## Component Structure

```
src/
├── components/
│   ├── PromptInput.svelte
│   ├── PreviewWindow.svelte
│   ├── OverrideControls.svelte
│   ├── ExportButton.svelte
│   └── StatusDisplay.svelte
├── stores/
│   ├── promptStore.js
│   ├── contentStore.js
│   └── uiStateStore.js
└── utils/
    ├── api.js
    └── validation.js
```

For detailed information about specific components, refer to:

- [Frontend Component Diagram](FRONTEND_DIAGRAM.md)
- [Detailed Component Description](FRONTEND_DETAILS.md)
- [Frontend Implementation Notes](FRONTEND_IMPLEMENTATION.md)

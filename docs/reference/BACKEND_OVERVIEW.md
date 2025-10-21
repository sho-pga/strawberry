# AetherPress Backend Overview

## Core Architecture

AetherPress's backend is built as a Node.js service with the following key components:

1. **Express Server**

   - Handles HTTP requests and API endpoints
   - Manages routing and middleware
   - Provides health check system
   - Implements error handling

2. **Core Services**

   - Content Generation (AI orchestration)
   - Preview Generation
   - PDF Export System
   - Image Processing
   - Background Job Management

3. **Data Layer**
   - SQLite database (with PostgreSQL migration path)
   - CRUD operations
   - Migration system
   - Job queue storage

## Key Features

### 1. Content Processing Pipeline

- Prompt processing and validation
- AI service integration (abstraction layer)
- Content structuring and formatting
- Quality validation

### 2. Preview System

- HTML template generation
- Real-time content updates
- Template system with styling
- Image integration

### 3. Export System

- PDF generation via Puppeteer
- A4 format support
- Background image handling
- Quality validation
- Progress tracking

### 4. Image Processing

- SVG/PNG/JPEG support
- Optional SVG rasterization
- Image generation integration
- Quality validation

### 5. Background Jobs

- Export job queuing
- Progress monitoring
- State management
- Error handling

## Infrastructure

### Environment

- Node.js runtime
- Express framework
- Puppeteer for PDF generation
- SQLite for data persistence

### Configuration

- Environment-based settings
- Feature flags
- Service toggles
- Quality parameters

### Monitoring

- Health checks
- Error tracking
- Job metrics
- Resource usage monitoring

## API Structure

```
POST /api/prompt   - Content generation
GET  /api/preview  - Preview rendering
POST /api/export   - PDF export
GET  /api/health   - System health
POST /api/export/job - Background export
GET  /api/export/job/:id - Job status
```

For detailed information about specific components, refer to:

- [Backend Service Diagram](BACKEND_DIAGRAM.md)
- [Detailed Service Description](BACKEND_DETAILS.md)
- [Backend Implementation Notes](BACKEND_IMPLEMENTATION.md)

# AetherPress Backend Detailed Service Description

## Core Services

### 1. AI Service

The AI service orchestrates content generation through integration with AI models.

#### Key Components

- Service abstraction layer
- Prompt processing and enhancement
- Response formatting
- Error handling and retry logic

#### Behavior

- Validates and processes input prompts
- Enhances prompts with context
- Manages AI model communication
- Formats and validates responses
- Handles rate limiting and quotas

### 2. Preview Generator

Handles the generation of HTML previews for content visualization.

#### Key Components

- Template engine
- Image processing
- Content formatting
- Style management

#### Behavior

- Generates HTML from content
- Processes and embeds images
- Applies styling and layout
- Updates in real-time
- Validates output

### 3. PDF Export System

Manages the generation of PDF documents through Puppeteer.

#### Key Components

- Puppeteer integration
- Template rendering
- Image handling
- Quality validation

#### Behavior

- Renders content to PDF
- Handles page formatting
- Processes background images
- Validates PDF quality
- Manages temporary files

### 4. Image Service

Processes and generates images for the application.

#### Key Components

- Image format handling
- SVG rasterization
- Generation integration
- Validation system

#### Behavior

- Processes various image formats
- Optional SVG rasterization
- Generates placeholder images
- Validates image quality
- Manages image storage

### 5. Job Manager

Handles background processing and task queuing.

#### Key Components

- Job queue
- State management
- Progress tracking
- Error handling

#### Behavior

- Queues export jobs
- Tracks job progress
- Handles failures
- Manages resources
- Provides status updates

## Data Layer

### Database (SQLite/PostgreSQL)

Primary data storage for the application.

#### Key Components

- Schema management
- Migration system
- CRUD operations
- Query optimization

#### Behavior

- Stores application data
- Manages migrations
- Handles transactions
- Ensures data integrity

### Job Queue

Manages background task processing.

#### Key Components

- Queue management
- State tracking
- Resource control
- Error handling

#### Behavior

- Queues background tasks
- Tracks task status
- Manages retries
- Handles failures

## API Layer

### Endpoints

#### POST /api/prompt

Content generation endpoint.

```json
{
  "prompt": "string",
  "options": {
    "enhance": boolean,
    "format": string
  }
}
```

#### GET /api/preview

Preview generation endpoint.

- Query params: contentId, version
- Returns: HTML content

#### POST /api/export

PDF export endpoint.

```json
{
  "content": {
    "title": string,
    "body": string
  },
  "options": {
    "format": "A4",
    "quality": "high|medium|low"
  }
}
```

#### POST /api/export/job

Background export job creation.

```json
{
  "content": object,
  "options": object,
  "callback": string
}
```

#### GET /api/export/job/:id

Job status endpoint.

- Returns: Job status and progress

## Configuration

### Environment Variables

```bash
NODE_ENV=production|development
PORT=3000
DB_TYPE=sqlite|postgres
PDF_QUALITY=high|medium|low
EXPORT_RASTERIZE_SVG=0|1
AI_SERVICE_URL=string
API_KEY=string
```

### Feature Flags

- `ENABLE_AI_SERVICE`: Enable AI integration
- `ENABLE_IMAGE_GEN`: Enable image generation
- `ENABLE_BACKGROUND_JOBS`: Enable job queue
- `ENABLE_SVG_RASTERIZE`: Enable SVG rasterization

## Error Handling

### Error Types

1. Validation Errors
2. Processing Errors
3. Service Errors
4. System Errors

### Error Response Format

```json
{
  "error": string,
  "code": string,
  "details": object,
  "timestamp": string
}
```

## Monitoring

### Health Checks

- System health status
- Service availability
- Resource utilization
- Error rates

### Metrics

- Response times
- Queue length
- Job completion rates
- Resource usage
- Error frequency

### Logging

- Application logs
- Error logs
- Access logs
- Job logs
- System logs

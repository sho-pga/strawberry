# AetherPress Backend Architecture Diagram

```mermaid
graph TB
    subgraph Client
        UI[Frontend UI]
    end

    subgraph Backend
        API[API Layer]

        subgraph Core Services
            AI[AI Service]
            Preview[Preview Generator]
            Export[PDF Export]
            IMG[Image Service]
            Jobs[Job Manager]
        end

        subgraph Data Layer
            DB[(SQLite/PostgreSQL)]
            Queue[(Job Queue)]
        end

        subgraph External Services
            Gemini[Gemini AI]
            Browser[Headless Browser]
        end
    end

    UI --> API
    API --> AI
    API --> Preview
    API --> Export
    API --> IMG
    API --> Jobs

    AI --> Gemini
    Export --> Browser
    Jobs --> Queue
    AI --> DB
    Jobs --> DB

    IMG --> Preview
    Preview --> Export

    style API fill:#f9f,stroke:#333,stroke-width:2px
    style UI fill:#bbf,stroke:#333,stroke-width:2px
    style DB fill:#dfd,stroke:#333,stroke-width:2px
    style Queue fill:#dfd,stroke:#333,stroke-width:2px
```

## Component Interactions

### Data Flow

1. Client sends request to API Layer
2. API Layer routes to appropriate service:
   - Prompts → AI Service
   - Preview requests → Preview Generator
   - Export requests → PDF Export/Job Manager
3. Services interact with data layer as needed
4. Results returned to client via API Layer

### Service Communication

- **AI Service** ↔ Gemini: Content/image generation
- **Preview Generator** ← Image Service: Asset processing
- **PDF Export** ↔ Headless Browser: PDF generation
- **Job Manager** ↔ Queue: Background task handling

### State Management

- Database stores application data
- Job queue manages export tasks
- Memory cache for active operations
- File system for temporary assets

## Security Boundaries

```mermaid
graph LR
    subgraph Public Zone
        Client[Client]
    end

    subgraph DMZ
        API[API Gateway]
        Rate[Rate Limiter]
    end

    subgraph Private Zone
        Services[Core Services]
        Data[Data Layer]
    end

    Client --> API
    API --> Rate
    Rate --> Services
    Services --> Data

    style Public Zone fill:#fee,stroke:#f66,stroke-width:2px
    style DMZ fill:#efe,stroke:#6f6,stroke-width:2px
    style Private Zone fill:#eef,stroke:#66f,stroke-width:2px
```

### Security Measures

1. Rate limiting on API endpoints
2. Input validation at API layer
3. Sanitization of user content
4. Access control for sensitive operations

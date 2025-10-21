# AetherPress System Architecture Diagram

## System Overview

```mermaid
graph TB
    subgraph User Interface
        UI[Web Interface]
        Input[Prompt Input]
        Preview[Preview System]
        Export[Export Controls]
    end

    subgraph Processing Layer
        AI[AI Service]
        IMG[Image Generator]
        Format[Content Formatter]
        Valid[Validator]
    end

    subgraph Export System
        PDF[PDF Generator]
        Quality[Quality Control]
        Storage[File Storage]
    end

    subgraph Data Layer
        DB[(Database)]
        Cache[(Cache)]
        Files[(File System)]
    end

    UI --> Input
    Input --> AI
    AI --> Format
    Format --> Preview
    Preview --> Export
    Export --> PDF
    IMG --> Format
    Format --> Valid
    Valid --> Preview
    PDF --> Quality
    Quality --> Storage

    AI --> DB
    Format --> Cache
    Storage --> Files

    style UI fill:#bbf,stroke:#333,stroke-width:2px
    style Processing Layer fill:#f9f,stroke:#333,stroke-width:2px
    style Export System fill:#ffd,stroke:#333,stroke-width:2px
    style Data Layer fill:#dfd,stroke:#333,stroke-width:2px
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant AI
    participant Process
    participant Export
    participant Storage

    User->>UI: Enter Prompt
    UI->>AI: Generate Content
    AI->>Process: Format Content
    Process->>UI: Show Preview
    User->>UI: Approve/Edit
    UI->>Export: Request Export
    Export->>Process: Generate PDF
    Process->>Storage: Save File
    Storage->>UI: Return Download
    UI->>User: Provide File
```

## Component Architecture

```mermaid
graph TB
    subgraph Frontend Layer
        UI[User Interface]
        State[State Management]
        API[API Client]
    end

    subgraph Backend Layer
        Server[Express Server]
        Services[Core Services]
        Queue[Job Queue]
    end

    subgraph External Services
        AI[AI Model]
        Storage[File Storage]
        DB[(Database)]
    end

    UI --> State
    State --> API
    API --> Server
    Server --> Services
    Services --> Queue
    Services --> External Services
    Queue --> External Services

    style Frontend Layer fill:#bbf,stroke:#333,stroke-width:2px
    style Backend Layer fill:#f9f,stroke:#333,stroke-width:2px
    style External Services fill:#dfd,stroke:#333,stroke-width:2px
```

## Process Flow

```mermaid
stateDiagram-v2
    [*] --> InputPrompt
    InputPrompt --> GenerateContent
    GenerateContent --> ProcessContent
    ProcessContent --> Preview
    Preview --> Edit
    Edit --> Preview
    Preview --> Export
    Export --> QualityCheck
    QualityCheck --> Delivery
    Delivery --> [*]

    state GenerateContent {
        [*] --> AIProcess
        AIProcess --> ImageGen
        ImageGen --> Format
        Format --> [*]
    }

    state Export {
        [*] --> CreatePDF
        CreatePDF --> Validate
        Validate --> Store
        Store --> [*]
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Client
        Browser[Web Browser]
    end

    subgraph Application
        FE[Frontend Service]
        BE[Backend Service]
        WQ[Work Queue]
    end

    subgraph Services
        AI[AI Service]
        DB[(Database)]
        FS[File Storage]
    end

    Browser --> FE
    FE --> BE
    BE --> WQ
    BE --> Services
    WQ --> Services

    style Client fill:#fee,stroke:#f66,stroke-width:2px
    style Application fill:#efe,stroke:#6f6,stroke-width:2px
    style Services fill:#eef,stroke:#66f,stroke-width:2px
```

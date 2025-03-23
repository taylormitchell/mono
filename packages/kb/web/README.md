# Git Knowledge Base Client

## Overview

This application provides a modern web interface for interacting with a git-based knowledge base. It allows users to browse, search, create, and edit content stored in a git repository, with metadata tracked by the git-knowledge-base tool.

## Architecture

The application follows a client-server architecture:

```
git-knowledge-base-client/
├── client/           # React frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   ├── index.html    # Entry HTML
│   └── vite.config.ts # Vite configuration
├── server/           # Backend application
│   ├── src/          # Source code
│   └── index.ts      # Server entry point
├── shared/           # Shared types and utilities
│   ├── types.ts      # TypeScript interfaces
│   └── schemas.ts    # Zod schemas
└── package.json      # Project dependencies
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Bun
- **Package Management**: Bun
- **Build Tool**: Vite
- **Frontend Framework**: React
- **Backend Communication**: tRPC
- **State Management**: Replicache
- **Schema Validation**: Zod
- **Editor**: CodeMirror
- **Styling**: TailwindCSS

## Core Features

1. **Knowledge Base Browsing**
   - Flat list of files sorted by creation date
   - Metadata display (creation date, last updated, etc.)

2. **Content Management**
   - Create new files
   - Edit existing files
   - Delete files

3. **Search Capabilities**
   - Full-text search across all content
   - Metadata-based filtering

4. **Synchronization**
   - Real-time updates using Replicache
   - Offline support with local changes

## Data Flow & State Management

### Replicache Integration

The application uses Replicache for state management, which provides:
- Offline-first capabilities with local-first data storage
- Optimistic UI updates for instant feedback
- Efficient synchronization with the server
- Automatic conflict resolution

### Git-Based Backend Integration

Unlike typical Replicache implementations that use databases like Postgres or MySQL, this application interfaces with a git repository:

1. **Git as the Source of Truth**
   - Instead of database tables, data is stored in git-tracked files
   - The `.metadata/` directory created by git-knowledge-base stores additional information
   - Git commit history provides versioning information

2. **Server Translation Layer**
   - The server translates between Replicache's key-value operations and git operations
   - Client mutations are converted to appropriate git commands (commit, file creation, etc.)
   - The git repository's state is converted to Replicache's expected format during pulls

3. **Version Management**
   - Git commit hashes serve as version identifiers for Replicache's sync mechanism
   - The server tracks which commits each client has synced

### Data Flow Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│   Client    │◄────────│  Replicache  │◄────────│   Server    │
│  (React)    │         │             │         │  (tRPC)     │
│             │────────►│             │────────►│             │
└─────────────┘         └─────────────┘         └─────────────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │             │
                                               │     Git     │
                                               │ Knowledge   │
                                               │    Base     │
                                               │             │
                                               └─────────────┘
```

### Replicache Sync Mechanism

Replicache uses a push/pull mechanism for synchronization:

1. **Pull**: The client requests changes from the server
   - Client sends its current version (git commit hash as cookie)
   - Server responds with changes since that version
   - Client applies these changes to its local state

2. **Push**: The client sends mutations to the server
   - Client sends a batch of mutations that occurred locally
   - Server processes these mutations and applies them to the git repository
   - Server responds with success/failure for each mutation

3. **Client-side Processing**:
   - All data querying, filtering, and searching happens on the client
   - The client maintains a complete local copy of the knowledge base
   - Mutations are applied optimistically and then confirmed/rejected by the server

## Type-Safe API with tRPC and Zod

### tRPC Integration

The application uses tRPC to provide end-to-end type safety between the client and server:

- Shared type definitions between client and server
- Automatic type inference for API calls
- Runtime validation using Zod schemas
- Simplified API development with reduced boilerplate

### Zod Schemas

Zod schemas are defined in the shared directory and used by both client and server for:

- Validating API inputs and outputs
- Defining the shape of data models
- Providing runtime type checking
- Generating TypeScript types

### Core API Procedures

The application initially uses just two main tRPC procedures for Replicache synchronization:

- `mutation.replicache.push`: Process client mutations
  - Receives a batch of mutations from the client
  - Applies these mutations to the git repository
  - Returns success/failure status for each mutation

- `query.replicache.pull`: Provide changes to the client
  - Receives the client's current version (commit hash)
  - Returns changes that have occurred since that version
  - Provides a new version (commit hash) as the cookie

Additional tRPC procedures may be added in the future for features beyond the core Replicache functionality.

## Client-Side Data Operations

All data operations are performed client-side using Replicache:

1. **Querying and Filtering**
   - Files are queried from the local Replicache database
   - Filtering and sorting happen entirely on the client
   - Search is performed against the local data

2. **Mutations**
   - File creation, updates, and deletions are defined as Replicache mutations
   - Mutations are applied optimistically to the local state
   - Mutations are sent to the server via the push mechanism
   - The client handles rollback if mutations fail on the server

## Implementation Plan

### Phase 1: Project Setup

1. Initialize project structure
2. Set up Vite, React, and tRPC
3. Configure TypeScript
4. Define Zod schemas
5. Set up Replicache

### Phase 2: Server Implementation

1. Create tRPC server
2. Implement Replicache push/pull endpoints
3. Integrate with git-knowledge-base
4. Implement mutation processing

### Phase 3: Client Implementation

1. Create core UI components
2. Define Replicache data model and mutations
3. Implement client-side querying and filtering
4. Build file viewer and editor

### Phase 4: Integration & Testing

1. Connect client and server
2. Implement synchronization logic
3. Test offline capabilities
4. Performance optimization

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd git-knowledge-base-client

# Install dependencies
bun install

# Start development server
bun run dev
```

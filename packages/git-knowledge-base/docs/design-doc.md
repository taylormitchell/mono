# Metadata Tracking Tool Specification

## Overview
A TypeScript ecosystem running on Bun that tracks file metadata in a git repository, specifically capturing creation date, last updated date, and commit information for each file. The system consists of:

1. A command-line tool for metadata generation and management
2. A web client for browsing and interacting with the knowledge base
3. A server component that bridges the web client with the git repository

The metadata is stored as individual JSON files, separate from the content files, enabling rich querying and filtering capabilities.

## System Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│   Client    │◄────────│  Replicache │◄────────│   Server    │
│  (React)    │         │             │         │  (tRPC)     │
│             │────────►│             │────────►│             │
└─────────────┘         └─────────────┘         └─────────────┘
                                                      │
                                                      ▼
                        ┌─────────────┐         ┌─────────────┐
                        │             │         │             │
                        │             │◄─────── │     Git     │
                        │    CLI      │         │ Knowledge   │
                        │             │────────►│    Base     │
                        |             |         |             |
                        └─────────────┘         └─────────────┘
```

## Core Requirements

### Metadata Storage
- Store metadata as individual JSON files in a `.metadata/` directory
- Mirror the content directory structure within `.metadata/`
- Naming convention: `original/path/to/file.md` → `.metadata/original/path/to/file.md.json`
- All metadata files are tracked in git

### Metadata Schema
```typescript
interface FileMetadata {
  schemaVersion: number;  // For future schema evolution
  firstCommitDate: string;      // ISO datetime of file creation (from git)
  lastCommitDate: string;      // ISO datetime of last modification (from git)
  lastCommitHash: string;     // Hash of the last commit
  custom?: {          // Optional user-modifiable fields
    createdAt?: string;  // User override for creation date
  };
}
```

### Metadata Directory Structure
```
repo/
├── .metadata/
│   ├── notes/
│   │   ├── topic1/
│   │   │   └── note1.md.json
│   │   └── topic2/
│   │       └── note2.json.json
│   └── .meta-config.json
├── notes/
│   ├── topic1/
│   │   └── note1.md
│   └── topic2/
│       └── note2.json
└── package.json
```

## Command-Line Tool Requirements

### Core Functionality
1. **Scan Repository**
   - Identify all files in the repository (excluding `.metadata/` directory, `.git/`, and `node_modules/`)
   - Support various file types (markdown, json, binaries, etc.)

2. **Extract Git Metadata**
   - Retrieve first commit date for `firstCommitDate`
   - Retrieve last commit date for `lastCommitDate`
   - Extract last commit hash for `lastCommitHash`

3. **Generate/Update Metadata Files**
   - Create/update corresponding JSON files in `.metadata/` directory
   - Preserve user-modified fields during updates
   - Ensure directory structure exists

4. **Handle Deleted Files**
   - Detect files that exist in `.metadata/` but not in content directories
   - Remove metadata files for deleted content files

5. **Handle Renamed Files**
   - Detect when files have been renamed using git history
   - Update metadata paths accordingly to maintain history

6. **Incremental Updates**
   - Update only changed files since last run
   - Use the `lastCommitHash` in config to determine which files have changed

### User Interface
- Command-line interface with clear output
- Support for operations:
  - `update`: Update all metadata (or only changed files since last run)
  - `init`: Initialize metadata for a new repository

## Web Client Requirements

### Technology Stack
- **Language**: TypeScript
- **Runtime**: Bun
- **Package Management**: Bun
- **Build Tool**: Vite
- **Frontend Framework**: React
- **Backend Framework**: Express
- **State Management**: Replicache
- **Schema Validation**: Zod
- **Editor**: CodeMirror
- **Styling**: TailwindCSS

### Core Features
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

### Client-Side Data Operations
- Files are queried from the local Replicache database
- Filtering and sorting happen entirely on the client
- Search is performed against the local data
- File mutations are applied optimistically and then confirmed by the server

## Web Server Requirements

### Core Functionality
1. **Express API**
   - Replicache push/pull endpoints for synchronization

2. **Knowledge Base API**
   - Read from and write to the knowledge base using the core utilities

3. **Synchronization**
   - Use git commit hashes as version identifiers
   - Track which commits each client has synced
   - Provide incremental updates to clients

### API Procedures
- `push`: Process client mutations
  - Receives a batch of mutations from the client
  - Applies these mutations to the git repository
  - Returns success/failure status for each mutation
- `pull`: Provide changes to the client
  - Receives the client's current version (commit hash)
  - Returns changes that have occurred since that version
  - Provides a new version (commit hash) as the cookie

## Web Data Flow & Synchronization

### Replicache Integration
The application uses Replicache for state management, which provides:
- Offline-first capabilities with local-first data storage
- Optimistic UI updates for instant feedback
- Efficient synchronization with the server
- Automatic conflict resolution

### Git-Based Backend Integration
Unlike typical Replicache implementations that use databases:
1. **Git as the Source of Truth**
   - Data is stored in git-tracked files
   - The `.metadata/` directory stores additional information
   - Git commit history provides versioning information

2. **Server Translation Layer**
   - The server translates between Replicache's key-value operations and git operations
   - Client mutations are converted to appropriate git commands
   - The git repository's state is converted to Replicache's expected format during pulls

3. **Sync Mechanism**
   - **Pull**: Client requests changes using its current version (git commit hash)
   - **Push**: Client sends mutations to the server for processing
   - Server applies mutations to the git repository and updates metadata

## Implementation Plan

### Phase 1: Command-Line Tool (completed)
1. Create basic project structure
2. Implement configuration management
3. Develop git operations utilities
4. Implement file system operations
5. Create metadata generation functions
6. Develop core commands (init, update)
7. Add error handling and logging

### Phase 2: Server Implementation
1. Create express server
2. Implement Replicache push/pull endpoints
3. Implement mutation processing

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
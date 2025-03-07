# Knowledge Base: A Git-Based Content Management System

## Overview

This project implements a flexible knowledge management system built directly on top of Git repositories. It consists of three integrated applications:

1. **Web Server**: Serves content and provides API endpoints for synchronization
2. **Web Client**: User interface for browsing, creating, and editing content 
3. **CLI Tool**: Command-line utilities for repository and metadata management

The core innovation is using a Git repository not just for version control, but as the primary data store with a dedicated metadata layer that enriches content with additional information while maintaining Git's distributed nature.

## Core Architecture

### Storage Model

The system uses two parallel structures within a Git repository:

```
my-knowledge-base/
├── .git/                  # Standard Git directory (not committed)
├── .metadata/             # Metadata directory (committed to Git)
│   ├── .meta-config.json  # Repository-level configuration
│   ├── path/to/file.md.json  # Metadata for specific file
│   └── ...
├── path/
│   └── to/
│       └── file.md        # Actual content
└── ...
```

- **Content**: Regular files in the repository (.md, .txt, etc.)
- **Metadata**: JSON files in `.metadata/` that mirror the content structure

This approach allows us to:
- Maintain all the benefits of Git (versioning, distribution, merging)
- Add rich metadata that Git doesn't natively support
- Keep metadata synchronized with content changes

### Metadata System

Each content file can have associated metadata like:
- Creation and modification timestamps independent of Git
- Last commit hash and date for tracking repository changes
- Future: tags, categories, and user-defined fields

The metadata is stored in parallel JSON files within the `.metadata/` directory, committed alongside content changes.

## Components

### Shared Code

Centralized utilities for operations used across all components:

1. **Git Operations** (`shared/git.ts`)
   - Low-level Git command execution
   - File history tracking
   - Commit identification and comparison

2. **Repository Management** (`shared/repo.ts`)
   - Metadata file handling
   - Configuration management
   - Repository initialization and updates

3. **Schema Definitions** (`shared/web/schemas.ts`)
   - Common data structures
   - Type definitions
   - Validation rules

### Web Server

A modern API server that:
- Serves repository content
- Implements Replicache push/pull endpoints
- Processes mutations to content and metadata
- Commits changes back to the repository

### Web Client

A React-based interface that:
- Uses Replicache for state management and offline capability
- Provides a UI for browsing and editing files
- Synchronizes changes with the server
- Displays file metadata alongside content

### CLI Tool

Command-line utilities for:
- Repository initialization
- Metadata management and updates
- Content operations outside the web interface

## Synchronization Strategy

The system uses Replicache for real-time synchronization, but with a non-traditional backend:

1. **Push Operations**:
   - Client sends mutations to server
   - Server applies changes to files
   - Changes are committed to Git

2. **Pull Operations**:
   - Server identifies changed files since client's last pull
   - Changed files and metadata are sent to client
   - Client updates its local state

3. **Conflict Resolution**:
   - Git handles content merges
   - Last-write-wins for metadata conflicts

## Technical Challenges

### Git as a Database

Traditional applications use purpose-built databases, but this system uses Git directly:

- **Advantages**: 
  - Inherits Git's distributed architecture
  - No separate database to maintain
  - Content and version history in one place

- **Challenges**:
  - No query language or indexes
  - Performance concerns with large repositories
  - Need to handle Git-specific operations (renames, merges)

### Replicache Integration

Adapting Replicache (designed for traditional databases) to work with Git:

- Implementing custom push/pull endpoints
- Transforming Git history into Replicache patch operations
- Managing last mutation IDs per client

### Metadata Synchronization

Keeping metadata in sync with content changes:

- Handling file renames and moves
- Addressing deletions
- Preserving metadata during Git operations

## Future Directions

### Enhanced Metadata

- Tagging system for content organization
- Custom user-defined metadata fields
- Structured data alongside unstructured content

### Search and Discovery

- Full-text search across repository
- Content indexing
- Metadata-based filtering

### Extended Interfaces

- Mobile client
- Enhanced CLI capabilities
- Editor integrations

## Implementation Considerations

- Optimizing Git operations for large repositories
- Content type detection and specialized handling
- Authentication and multi-user support

This design leverages Git's strengths while addressing its limitations for knowledge management through a dedicated metadata layer, creating a flexible system for personal and collaborative knowledge bases.
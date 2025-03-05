# Metadata Tracking Tool Specification

## Overview
A TypeScript tool running on Bun that tracks file metadata in a git repository, specifically capturing creation date, last updated date, and commit information for each file. The metadata is stored as individual JSON files, separate from the content files.

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
  path: string;           // Relative path to the file
  firstCommitDate: string;      // ISO datetime of file creation (from git)
  lastCommitDate: string;      // ISO datetime of last modification (from git)
  lastCommitHash: string;     // Hash of the last commit
  custom?: {          // Optional user-modifiable fields
    createdAt?: string;  // User override for creation date
    [key: string]: any;        // Extensible for future needs
  };
}
```

## Functional Requirements

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

## Technical Design

### Directory Structure
```
repo/
├── notes/
│   ├── topic1/
│   │   └── note1.md
│   └── topic2/
│       └── note2.json
├── .metadata/
│   ├── notes/
│   │   ├── topic1/
│   │   │   └── note1.md.json
│   │   └── topic2/
│   │       └── note2.json.json
│   └── .meta-config.json
└── package.json
```

### Configuration
Store tool configuration in `.metadata/.meta-config.json`:
```json
{
  "version": "1.0.0",
  "lastCommitHash": "1234567890",
  "schemaVersion": 1,
  "ignore": [
    "node_modules/**",
    ".git/**"
  ]
}
```

## Implementation Considerations

### Custom Metadata Handling
- User-defined `custom.createdAt` takes precedence over git history
- No validation rules for custom fields initially
- Custom fields are preserved during metadata updates

### Performance Optimizations
- Only process files that have changed since the last run (using `lastCommitHash`)
- Use efficient git commands (limiting history depth when possible)
- Process files in parallel where appropriate

### Error Handling
- Gracefully handle git command failures
- Provide clear error messages for issues
- Implement logging for debugging purposes

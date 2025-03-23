# Git Metadata Tracking Tool

A TypeScript tool running on Bun that tracks file metadata in a git repository, specifically capturing creation date, last updated date, and commit information for each file.

## Features

- Tracks file creation and modification dates from git history
- Stores metadata as individual JSON files in a `.metadata/` directory
- Supports custom user-defined metadata fields
- Handles file renames and deletions
- Incremental updates for efficiency

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd git-knowledge-base

# Install dependencies
bun install

# Link the CLI globally (optional)
bun link
```

## Usage

### Initialize Metadata

```bash
bun run index.ts init
```

This command initializes metadata for all files in the repository.

### Update Metadata

```bash
bun run index.ts update
```

This command updates metadata for files that have changed since the last update.

### Options

Both commands support the following options:

- `-f, --force`: Force operation (initialization or update) even if not necessary
- `-v, --verbose`: Show verbose output

## Metadata Structure

Metadata is stored as JSON files in the `.metadata/` directory, mirroring the structure of your content files. For example:

- Content file: `notes/topic1/note1.md`
- Metadata file: `.metadata/notes/topic1/note1.md.json`

Each metadata file contains:

```json
{
  "schemaVersion": 1,
  "path": "notes/topic1/note1.md",
  "firstCommitDate": "2023-01-01T12:00:00Z",
  "lastCommitDate": "2023-02-01T14:30:00Z",
  "lastCommitHash": "abcdef123456",
  "custom": {
    "createdAt": "2022-12-15T10:00:00Z"
  }
}
```

## Development

```bash
# Run in development mode with auto-reload
bun run dev
```

## License

MIT

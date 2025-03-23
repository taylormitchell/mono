# `mono` CLI Tool Specification

## Overview
`mono` is a command-line tool designed to manage a personal monorepo containing multiple side projects. It streamlines common development workflows and provides a unified interface for project management tasks.

## Technology Stack
- **Language**: TypeScript
- **Runtime**: Bun
- **Package Manager**: Bun's built-in package manager
- **Command Parsing**: Commander.js

## Features
- Create new files in predefined locations (`mono script js` creates a JavaScript file in the scripts directory)

### maybe/later
- Open files in the default editor
- Run scripts and commands across projects
- Deploy specific projects to configured environments
- Execute build pipelines
- Show status of all projects in the monorepo
- Monitor dependencies and suggest updates
- Display git status across projects

## Configuration
Store configuration in a `.monorc.json` file at the user's home directory.
- Default editor
- ...

This specification provides a starting point for implementing the `mono` CLI tool, focusing on the most immediately useful features while leaving room for expansion as your workflow evolves.
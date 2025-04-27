# CLAUDE.md - Guidelines for Claude

## Important Files
- **spec.md**: Contains the full project specification and requirements
- **todo.md**: Lists next steps and current status of the project
- Always check and update these files as you work on the project

## Project Context
- Google Tasks client with React, TypeScript, Tailwind, and Replicache
- Single-user personal project used only by the owner

## Commands to Run
```bash
# Development
npm run dev      # Starts the Vite dev server
npm run build    # TypeScript build and Vite build
npm run lint     # Run ESLint checks
npm run preview  # Vite preview
```

## Working Guidelines
1. Always check spec.md for requirements before implementing features
2. Update todo.md as tasks are completed or new tasks are identified
3. Follow React + TypeScript best practices
4. Use Tailwind for styling
5. Implement Replicache pattern for state management
6. Run lint before committing changes

## Key Technologies
- React 19
- TypeScript
- Tailwind CSS
- Replicache
- Vite
- Google Tasks API

## Notes for Claude
- The project follows a local-first architecture with optimistic UI updates
- Always read the current implementation before making changes
- When uncertain about implementation details, refer to spec.md
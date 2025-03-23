# Todo Functionality: Design & Implementation Plan

## 1. Design Overview

This document outlines the design and implementation plan for the todo functionality in the Git Knowledge Base CLI tool. The todo system will allow users to create, manage, and organize tasks directly within their knowledge base repository.

### 1.1 Goals & Requirements

**Primary Goals:**
- Provide a simple yet powerful task management system within the knowledge base
- Leverage the Git-based architecture for version control of todos
- Enable flexible organization and retrieval of tasks
- Support both simple and complex todo workflows

**Core Requirements:**
- Store todos as individual entities with unique identifiers
- Support basic CRUD operations (create, read, update, delete)
- Enable filtering, sorting, and grouping of todos
- Provide a clean and intuitive command-line interface
- Ensure data validation and integrity

**Future Requirements:**
- Integration with the [metadata system](../docs/design-doc.md#metadata-system) for advanced relationships
- Support for complex task hierarchies and dependencies
- Synchronization with external todo systems

### 1.2 Data Model

The todo system will use a flexible data model with:

**Core Fields (Required):**
- `type`: Always "todo" (for type discrimination)

**Extended Fields (Optional):**
- `description`: Text description of the task
- `createdAt`: Creation timestamp
- `completedAt`: Completion timestamp
- `dueDate`: Due date for the task
- `priority`: Task priority (low, medium, high)
- `tags`: Array of string tags for categorization

### 1.3 Storage Strategy

- Store todos as individual JSON files in the current directory
- Use nanoid-based filenames and `.todo.json` extension (e.g., `a1b2c3d4e.todo.json`)
- Direct file system operations for CRUD functionality

### 1.4 User Interface

The todo functionality will be accessed through the CLI with a consistent command structure:

```
todo <command> [options]
```

**Command Set:**
- `list`: Display todos with filtering, sorting, and grouping options
- `create`: Create a new todo with various attributes
- `complete`: Mark a todo as completed
- `delete`: Remove a todo
- `edit`: Modify an existing todo's attributes

**Display Options:**
- Simple list view with status indicators
- Tree view for hierarchical relationships
- Summary statistics and aggregations

### 1.5 Query Capabilities

**Filtering:**
- Status-based (completed/incomplete)
- Date-based (created, due, completed)
- Tag-based
- Priority-based
- Full-text search in description and notes

**Sorting:**
- By creation date
- By due date
- By priority
- By completion status

**Grouping:**
- By directory location
- By date (day, week, month)
- By tags
- By priority
- By completion status

## 2. Implementation Plan

### 2.1 Phase 1: Basic Todo Management

**Core Implementation**
1. Define the Todo schema using Zod
   - Implement validation for all fields
   - Create type definitions

2. Implement basic file operations
   - Reading and writing todo files
   - Listing todos in a directory
   - Parsing todo content

3. Develop core commands
   - `todo list`: Basic listing functionality
   - `todo create`: Create with required fields
   - `todo complete`: Toggle completion status
   - `todo delete`: Remove todo files
   - `todo edit`: Basic editing capabilities

**Enhanced Functionality**
1. Implement filtering system
   - Parse filter expressions
   - Apply filters to todo collections
   - Support multiple filter combinations

2. Add sorting capabilities
   - Sort by various fields
   - Support ascending/descending order
   - Combine with filtering

3. Improve display formatting
   - Color-coded status indicators
   - Formatted date display
   - Truncation for long descriptions

### 2.2 Phase 2: Advanced Organization

**Grouping and Advanced Display**
1. Implement grouping logic
   - Group by various attributes
   - Support nested grouping
   - Format grouped output

2. Create advanced display options
   - Tree view for hierarchical display
   - Summary statistics
   - Custom formatting options

3. Add search capabilities
   - Full-text search
   - Fuzzy matching
   - Search result highlighting

### 2.3 Phase 3: Metadata Integration

**Integration with Knowledge Base**
1. Refactor for metadata directory structure
   - Move todos to `.metadata/` directory
   - Maintain backward compatibility
   - Update file operations

2. Implement relationship tracking
   - Todo dependencies
   - Links to content files
   - Hierarchical relationships

3. Add advanced features
   - Recurring todos
   - Import/export functionality
   - Batch operations

## 3. Technical Details

### 3.1 Todo Schema (Zod)

```typescript
const TodoSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('todo'),
  description: z.string(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  relatedFiles: z.array(z.string()).optional(),
  parentId: z.string().uuid().optional(),
});

type Todo = z.infer<typeof TodoSchema>;
```

### 3.2 Command Structure

```
todo
  ├── list [--filter <filter>] [--sort <sort>] [--group <group>]
  ├── create <description> [--due <date>] [--priority <priority>] [--tags <tags>]
  ├── complete <id>
  ├── delete <id>
  └── edit <id> [--description <text>] [--due <date>] [--priority <priority>] [--tags <tags>]
```

### 3.3 Filter Syntax

Support for complex filtering with a simple syntax:
- `status:incomplete`
- `due:today`
- `due:before:2023-12-31`
- `created:after:2023-01-01`
- `tag:important`
- `priority:high`

### 3.4 Grouping Options

- `--group directory`: Group by directory location
- `--group date:created`: Group by creation date
- `--group date:due`: Group by due date
- `--group tag`: Group by tags
- `--group priority`: Group by priority level

## 4. Future Considerations

- Web interface integration for visual todo management
- Mobile app synchronization for on-the-go access
- Calendar integration for timeline visualization
- Notification system for due date reminders
- Team collaboration features for shared knowledge bases
- Advanced analytics and reporting on task completion
- Custom workflow automation for recurring tasks

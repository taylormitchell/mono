import type { Todo } from "../schemas/todo";

/**
 * Filter options for todos
 */
export interface TodoFilterOptions {
  status?: "completed" | "incomplete" | "all";
  dueBefore?: string;
  dueAfter?: string;
  createdBefore?: string;
  createdAfter?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  search?: string;
}

function toDate(date: string) {
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // For dates without time, assume local time at end of day
    return new Date(`${date}T23:59:59Z`);
  } else {
    return new Date(date);
  }
}

/**
 * Filter todos based on the provided options
 */
export function filterTodos(todos: Todo[], options: TodoFilterOptions): Todo[] {
  return todos.filter((todo) => {
    // Filter by status
    if (options.status === "completed" && !todo.completedAt) {
      return false;
    }
    if (options.status === "incomplete" && todo.completedAt) {
      return false;
    }

    // Filter by due date
    if (options.dueBefore && (!todo.dueDate || toDate(todo.dueDate) > toDate(options.dueBefore))) {
      return false;
    }
    if (options.dueAfter && (!todo.dueDate || toDate(todo.dueDate) < toDate(options.dueAfter))) {
      return false;
    }
    // Filter by created date
    if (
      options.createdBefore &&
      (!todo.createdAt || toDate(todo.createdAt) > toDate(options.createdBefore))
    ) {
      return false;
    }
    if (
      options.createdAfter &&
      (!todo.createdAt || toDate(todo.createdAt) < toDate(options.createdAfter))
    ) {
      return false;
    }

    // Filter by priority
    if (options.priority && todo.priority !== options.priority) {
      return false;
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      if (!todo.tags || !options.tags.some((tag) => todo.tags?.includes(tag))) {
        return false;
      }
    }

    // Filter by search term
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      const descriptionMatch = todo.description.toLowerCase().includes(searchTerm);
      const tagsMatch = todo.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)) || false;
      if (!descriptionMatch && !tagsMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort todos based on the provided field and direction
 */
export function sortTodos(
  todos: Todo[],
  sortBy: "dueDate" | "createdAt" | "completedAt" | "priority" | "description" = "createdAt",
  sortDirection: "asc" | "desc" = "desc"
): Todo[] {
  return [...todos].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    // Get the values to compare
    switch (sortBy) {
      case "dueDate":
        valueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        valueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        break;
      case "createdAt":
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
        break;
      case "completedAt":
        valueA = a.completedAt ? new Date(a.completedAt).getTime() : Number.MAX_SAFE_INTEGER;
        valueB = b.completedAt ? new Date(b.completedAt).getTime() : Number.MAX_SAFE_INTEGER;
        break;
      case "priority":
        const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        valueA = a.priority ? priorityMap[a.priority] : 0;
        valueB = b.priority ? priorityMap[b.priority] : 0;
        break;
      case "description":
        valueA = a.description;
        valueB = b.description;
        break;
      default:
        sortBy satisfies never;
    }

    // Compare the values
    if (valueA === valueB) {
      return 0;
    }

    // Apply sort direction
    if (sortDirection === "asc") {
      return valueA < valueB ? -1 : 1;
    } else {
      return valueA > valueB ? -1 : 1;
    }
  });
}

/**
 * Parse a filter string into filter options
 * Examples:
 * - "status:incomplete"
 * - "due:today"
 * - "due:before:2023-12-31"
 * - "created:after:2023-01-01"
 * - "tag:important"
 * - "priority:high"
 */
export function parseFilterString(filterString: string): TodoFilterOptions {
  const options: TodoFilterOptions = {};

  // Split the filter string by spaces
  const parts = filterString.split(" ");

  for (const part of parts) {
    // Skip empty parts
    if (!part) continue;

    // Split by colon
    const [key, ...valueParts] = part.split(":");
    const value = valueParts.join(":");

    if (!key || !value) continue;

    switch (key) {
      case "status":
        if (["completed", "incomplete", "all"].includes(value)) {
          options.status = value as "completed" | "incomplete" | "all";
        }
        break;
      case "due":
        if (value === "today") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          options.dueAfter = today.toISOString();
          options.dueBefore = tomorrow.toISOString();
        } else if (value === "tomorrow") {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const dayAfter = new Date(tomorrow);
          dayAfter.setDate(dayAfter.getDate() + 1);
          options.dueAfter = tomorrow.toISOString();
          options.dueBefore = dayAfter.toISOString();
        } else if (value === "week") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          options.dueAfter = today.toISOString();
          options.dueBefore = nextWeek.toISOString();
        } else if (value.startsWith("before:")) {
          options.dueBefore = new Date(value.substring(7)).toISOString();
        } else if (value.startsWith("after:")) {
          options.dueAfter = new Date(value.substring(6)).toISOString();
        }
        break;
      case "created":
        if (value.startsWith("before:")) {
          options.createdBefore = new Date(value.substring(7)).toISOString();
        } else if (value.startsWith("after:")) {
          options.createdAfter = new Date(value.substring(6)).toISOString();
        }
        break;
      case "priority":
        if (["low", "medium", "high"].includes(value)) {
          options.priority = value as "low" | "medium" | "high";
        }
        break;
      case "tag":
        options.tags = options.tags || [];
        options.tags.push(value);
        break;
      case "search":
        options.search = value;
        break;
    }
  }

  return options;
}

import { z } from "zod";
import { getTimestampWithTimezone } from "../../../shared/utils";

/**
 * Schema for Todo objects
 */
export const TodoFileContentsSchema = z.object({
  type: z.literal("todo"),
  description: z.string().optional().default(""),
  createdAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  dueDate: z
    .union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const TodoSchema = TodoFileContentsSchema.extend({
  filePath: z.string(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoFileContents = z.infer<typeof TodoFileContentsSchema>;

/**
 * Create a new Todo object with the given description
 */
export function createTodoFileContents(
  description: string,
  options: {
    dueDate?: string;
    priority?: "low" | "medium" | "high";
    tags?: string[];
    notes?: string;
    relatedFiles?: string[];
    parentId?: string;
  } = {}
): TodoFileContents {
  return {
    type: "todo",
    description,
    createdAt: getTimestampWithTimezone(),
    ...options,
  };
}

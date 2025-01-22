import { z } from "zod";

export const todoSchema = z.object({
  id: z.string(),
  content: z.string(),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  status: z.enum(["active", "completed"]).default("active"),
  parentIds: z.array(z.string()).default([]), // defines the DAG of todos. see [note](@/notes/2025-01-16_07-42-08_-0500.md)
});

export type Todo = z.infer<typeof todoSchema>;

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
});

export type Project = z.infer<typeof projectSchema>;

const createTodoMutationSchema = z.object({
  name: z.literal("createTodo"),
  args: todoSchema,
});

const updateTodoMutationSchema = z.object({
  name: z.literal("updateTodo"),
  args: todoSchema.partial().extend({
    id: z.string(),
  }),
});

const deleteTodoMutationSchema = z.object({
  name: z.literal("deleteTodo"),
  args: z.object({
    id: z.string(),
    deletedAt: z.string(),
  }),
});

const createProjectMutationSchema = z.object({
  name: z.literal("createProject"),
  args: projectSchema,
});

const updateProjectMutationSchema = z.object({
  name: z.literal("updateProject"),
  args: projectSchema.partial().extend({
    id: z.string(),
  }),
});

export const MutationSchema = z.union([
  createTodoMutationSchema,
  updateTodoMutationSchema,
  deleteTodoMutationSchema,
  createProjectMutationSchema,
  updateProjectMutationSchema,
]);

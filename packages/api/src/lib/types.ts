import { generate } from "@rocicorp/rails";
import { z } from "zod";

export const todoSchema = z.object({
  id: z.string(),
  content: z.string(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  labels: z.string(),
  version: z.number(),
});

export const {
  put: putTodo,
  get: getTodo,
  update: updateTodo,
  delete: deleteTodo,
  list: listTodos,
} = generate("todo", todoSchema.parse);

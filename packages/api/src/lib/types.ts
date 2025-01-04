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

export const mutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  name: z.string(),
  args: todoSchema,
});

export const pushSchema = z.object({
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

export type Todo = z.infer<typeof todoSchema>;
export type Mutation = z.infer<typeof mutationSchema>;
export type Push = z.infer<typeof pushSchema>;

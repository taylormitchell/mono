import { z } from "zod";

const itemStatusSchema = z.enum(["active", "completed"]);

export const itemStatusList = [null, ...itemStatusSchema.options] as const;

export const itemSchema = z.object({
  id: z.string(),
  name: z.string().nullable().default(null),
  content: z.string(),
  contentType: z.enum(["markdown", "json"]).default("markdown"),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  version: z.number().default(0),
  status: itemStatusSchema.nullable().default(null),
  children: z.array(z.string()).default([]), // Array of item IDs
});

export type Item = z.infer<typeof itemSchema>;

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
});

export type Project = z.infer<typeof projectSchema>;

const createItemMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("createItem"),
  args: itemSchema,
});

const updateItemMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("updateItem"),
  args: itemSchema.partial().extend({
    id: z.string(),
  }),
});

const deleteItemMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("deleteItem"),
  args: z.object({
    id: z.string(),
    deletedAt: z.string(),
  }),
});

export const mutationSchema = z.union([
  createItemMutationSchema,
  updateItemMutationSchema,
  deleteItemMutationSchema,
]);

export type Mutation = z.infer<typeof mutationSchema>;

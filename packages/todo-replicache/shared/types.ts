import { z } from "zod";

export const todoSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  version: z.number().default(0),
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

export const viewSchema = z.object({
  id: z.string(),
  name: z.string(),
  filter: z.object({
    status: z.enum(["all", "active", "completed"]).optional(),
  }),
  sort: z.object({
    field: z.enum(["position", "createdAt", "dueDate"]),
    direction: z.enum(["asc", "desc"]),
  }),
  positions: z.record(z.string()), // Map of todoId -> position string
});

export type View = z.infer<typeof viewSchema>;

const createTodoMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("createTodo"),
  args: todoSchema,
});

const updateTodoMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("updateTodo"),
  args: todoSchema.partial().extend({
    id: z.string(),
  }),
});

const deleteTodoMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("deleteTodo"),
  args: z.object({
    id: z.string(),
    deletedAt: z.string(),
  }),
});

const createViewMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("createView"),
  args: viewSchema,
});

const updateViewMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("updateView"),
  args: viewSchema.partial().extend({
    id: z.string(),
  }),
});

const deleteViewMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("deleteView"),
  args: z.object({
    id: z.string(),
    deletedAt: z.string(),
  }),
});

// const createProjectMutationSchema = z.object({
//   name: z.literal("createProject"),
//   args: projectSchema,
// });

// const updateProjectMutationSchema = z.object({
//   name: z.literal("updateProject"),
//   args: projectSchema.partial().extend({
//     id: z.string(),
//   }),
// });

export const mutationSchema = z.union([
  createTodoMutationSchema,
  updateTodoMutationSchema,
  deleteTodoMutationSchema,
  //   createProjectMutationSchema,
  //   updateProjectMutationSchema,
  createViewMutationSchema,
  updateViewMutationSchema,
  deleteViewMutationSchema,
]);

export type Mutation = z.infer<typeof mutationSchema>;

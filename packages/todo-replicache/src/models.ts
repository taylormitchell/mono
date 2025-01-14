// Mutators
import { z } from "zod";
import { WriteTransaction } from "replicache";

const todoSchema = z.object({
  id: z.string(),
  content: z.string(),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  status: z.enum(["active", "completed"]).default("active"),
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

type Mutation = z.infer<typeof MutationSchema>;

type MutationNames = Mutation["name"];

type MutatorFunction<T extends Mutation> = (tx: WriteTransaction, args: T["args"]) => Promise<void>;

/**
 * Used to define the mutators for the frontend.
 *
 * @example
 * const mutators: FrontendMutators = {
 *   createTodo: async (tx: WriteTransaction, { id, content }) => {
 *     await tx.set(`todo/${id}`, { id, content });
 *   },
 * };
 */
export type FrontendMutators = Partial<{
  [K in MutationNames]: MutatorFunction<Extract<Mutation, { name: K }>>;
}>;

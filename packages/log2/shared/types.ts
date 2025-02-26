import { z } from "zod";

export const logDataSchema = z.array(
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
);
export type LogData = z.infer<typeof logDataSchema>;

export const logSchema = z.object({
  id: z.string(),
  text: z.string(),
  data: logDataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  version: z.number().default(0),
});

export type Log = z.infer<typeof logSchema>;

export const promptSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  version: z.number().default(0),
});

export type Prompt = z.infer<typeof promptSchema>;

const createLogMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("createLog"),
  args: logSchema,
});

const updateLogMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("updateLog"),
  args: logSchema.partial().extend({
    id: z.string(),
  }),
});

const deleteLogMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("deleteLog"),
  args: z.object({
    id: z.string(),
    deletedAt: z.string(),
  }),
});

const createPromptMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("createPrompt"),
  args: promptSchema,
});

const updatePromptMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("updatePrompt"),
  args: promptSchema.partial().extend({
    id: z.string(),
  }),
});

const deletePromptMutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  timestamp: z.number(),
  name: z.literal("deletePrompt"),
  args: z.object({ id: z.string(), deletedAt: z.string() }),
});

export const mutationSchema = z.union([
  createLogMutationSchema,
  updateLogMutationSchema,
  deleteLogMutationSchema,
  createPromptMutationSchema,
  updatePromptMutationSchema,
  deletePromptMutationSchema,
]);

export type ServerMutation =
  | Omit<z.infer<typeof createLogMutationSchema>, "clientID" | "timestamp" | "id">
  | Omit<z.infer<typeof updateLogMutationSchema>, "clientID" | "timestamp" | "id">
  | Omit<z.infer<typeof deleteLogMutationSchema>, "clientID" | "timestamp" | "id">
  | Omit<z.infer<typeof createPromptMutationSchema>, "clientID" | "timestamp" | "id">
  | Omit<z.infer<typeof updatePromptMutationSchema>, "clientID" | "timestamp" | "id">
  | Omit<z.infer<typeof deletePromptMutationSchema>, "clientID" | "timestamp" | "id">;

export type Mutation = z.infer<typeof mutationSchema>;

export const sseMessageSchema = z.union([
  z.object({ type: z.literal("poke") }),
  z.object({ type: z.literal("startProcessingLog"), args: z.object({ id: z.string() }) }),
  z.object({
    type: z.literal("finishedProcessingLog"),
    args: z.union([
      z.object({ id: z.string(), success: z.literal(true) }),
      z.object({ id: z.string(), success: z.literal(false), message: z.string() }),
    ]),
  }),
]);

export type SSEMessage = z.infer<typeof sseMessageSchema>;

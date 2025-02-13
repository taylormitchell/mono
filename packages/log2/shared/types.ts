import { z } from "zod";

export const logDataSchema = z.array(z.record(z.string(), z.any()));
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

export const mutationSchema = z.union([
  createLogMutationSchema,
  updateLogMutationSchema,
  deleteLogMutationSchema,
]);

export type Mutation = z.infer<typeof mutationSchema>;

import { z } from "zod";
import type { MutationV1 } from "replicache";
import { fileMetadataSchema } from "../repo";

export const fileSchema = z.object({
  path: z.string(),
  content: z.string(),
  metadata: fileMetadataSchema,
});

export const createFileMutationSchema = z.object({
  id: z.number(),
  name: z.literal("createFile"),
  clientID: z.string(),
  timestamp: z.number(),
  args: fileSchema,
});

export const updateFileMutationSchema = z.object({
  id: z.number(),
  name: z.literal("updateFile"),
  clientID: z.string(),
  timestamp: z.number(),
  args: fileSchema.partial().extend({ path: z.string() }),
});

export const deleteFileMutationSchema = z.object({
  id: z.number(),
  name: z.literal("deleteFile"),
  clientID: z.string(),
  timestamp: z.number(),
  args: z.object({ path: z.string() }),
});

export const mutationSchema = z.union([
  createFileMutationSchema,
  updateFileMutationSchema,
  deleteFileMutationSchema,
]);

export type Mutation = z.infer<typeof mutationSchema>;

// Check if all the mutations we've defined are valid
type CheckValidMutation<T extends MutationV1> = T;
type _ = CheckValidMutation<Mutation>;

// Types derived from schemas
export type File = z.infer<typeof fileSchema>;

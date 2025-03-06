import { z } from "zod";
import type { MutationV1 } from "replicache";

export const fileMetadataSchema = z.object({
  schemaVersion: z.number(),
  firstCommitDate: z.string().optional(),
  lastCommitDate: z.string().optional(),
  lastCommitHash: z.string().optional(),
  custom: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});

export const fileSchema = z.object({
  id: z.string(),
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
  args: fileSchema.partial().extend({ id: z.string() }),
});

export const deleteFileMutationSchema = z.object({
  id: z.number(),
  name: z.literal("deleteFile"),
  clientID: z.string(),
  timestamp: z.number(),
  args: z.object({ id: z.string() }),
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

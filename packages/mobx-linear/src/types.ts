import { z } from "zod";

export const ProjectSchema = z.object({
  model: z.literal("project"),
  id: z.string(),
  props: z.object({
    title: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export const IssueSchema = z.object({
  model: z.literal("issue"),
  id: z.string(),
  props: z.object({
    projectId: z.string().nullable(),
    title: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export const RelationSchema = z.object({
  model: z.literal("relation"),
  id: z.string(),
  props: z.object({
    fromId: z.string(),
    toId: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export type ProjectData = z.infer<typeof ProjectSchema>;

export type IssueData = z.infer<typeof IssueSchema>;

export type RelationData = z.infer<typeof RelationSchema>;

export type IssueProps = z.infer<typeof IssueSchema.shape.props>;

export type ProjectProps = z.infer<typeof ProjectSchema.shape.props>;

export type RelationProps = z.infer<typeof RelationSchema.shape.props>;

export const ModelNames = ["project", "issue", "relation"] as const;

export type ModelSchemas = {
  project: typeof ProjectSchema;
  issue: typeof IssueSchema;
  relation: typeof RelationSchema;
};

export type ModelName = (typeof ModelNames)[number];

export type UpdateEvent<K extends keyof ModelSchemas> = {
  operation: "update";
  model: K;
  id: string;
  // TODO: maybe do { [key: string]: { old: any; new: any } }
  oldProps: Partial<z.infer<ModelSchemas[K]["shape"]["props"]>>;
  newProps: Partial<z.infer<ModelSchemas[K]["shape"]["props"]>>;
};

export type CreateEvent<K extends keyof ModelSchemas> = {
  operation: "create";
  model: K;
  id: string;
  props: z.infer<ModelSchemas[K]["shape"]["props"]>;
};

export type DeleteEvent<K extends keyof ModelSchemas> = {
  operation: "delete";
  model: K;
  id: string;
  props: z.infer<ModelSchemas[K]["shape"]["props"]>;
};

export type SetEvent<K extends keyof ModelSchemas> = {
  operation: "set";
  model: K;
  id: string;
  oldProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
  newProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
};

export type Event<K extends keyof ModelSchemas> =
  | UpdateEvent<K>
  | CreateEvent<K>
  | DeleteEvent<K>
  | SetEvent<K>;

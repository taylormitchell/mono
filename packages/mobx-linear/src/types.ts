import { z } from "zod";

export const ProjectSchema = z.object({
  model: z.literal("project"),
  id: z.string(),
  props: z.object({
    title: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
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
  }),
});

export type ProjectData = z.infer<typeof ProjectSchema>;

export type IssueData = z.infer<typeof IssueSchema>;

export type IssueProps = z.infer<typeof IssueSchema.shape.props>;

export type RelationData = z.infer<typeof RelationSchema>;

export const ModelNames = ["project", "issue", "relation"] as const;

type ModelSchemas = {
  project: typeof ProjectSchema;
  issue: typeof IssueSchema;
  relation: typeof RelationSchema;
};

type UpdateEvent = {
  [K in keyof ModelSchemas]: {
    operation: "update";
    model: K;
    id: string;
    props: Partial<z.infer<ModelSchemas[K]["shape"]["props"]>>;
  };
}[keyof ModelSchemas];

type CreateEvent = {
  [K in keyof ModelSchemas]: {
    operation: "create";
    model: K;
    id: string;
    props: z.infer<ModelSchemas[K]["shape"]["props"]>;
  };
}[keyof ModelSchemas];

type DeleteEvent = {
  [K in keyof ModelSchemas]: {
    operation: "delete";
    model: K;
    id: string;
    props: z.infer<ModelSchemas[K]["shape"]["props"]>;
  };
}[keyof ModelSchemas];

type SetEvent = {
  [K in keyof ModelSchemas]: {
    operation: "set";
    model: K;
    id: string;
    oldProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
    newProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
  };
}[keyof ModelSchemas];

export type Event = UpdateEvent | CreateEvent | DeleteEvent | SetEvent;

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

export const IssuePropsSchema = z.object({
  projectId: z.string().nullable(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
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

export const RelationTypeSchema = z.enum(["related-to", "blocks"]);

export const RelationPropsSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: RelationTypeSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const RelationSchema = RelationPropsSchema.extend({
  model: z.literal("relation"),
  id: z.string(),
});

export const ViewPropsSchema = z.object({
  projectId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const ViewSchema = ViewPropsSchema.extend({
  model: z.literal("view"),
  id: z.string(),
});

export const ViewIssuePositionPropsSchema = z.object({
  viewId: z.string(),
  issueId: z.string(),
  position: z.string(),
});

export const ViewIssuePositionSchema = ViewIssuePositionPropsSchema.extend({
  model: z.literal("viewIssuePosition"),
  id: z.string(),
});

export const ModelSchemas = [
  ProjectSchema,
  IssueSchema,
  RelationSchema,
  ViewSchema,
  ViewIssuePositionSchema,
] as const;

export const ModelNames = ModelSchemas.map((schema) => schema.shape.model.value);

export type ModelName = (typeof ModelNames)[number];

export type ProjectData = z.infer<typeof ProjectSchema>;

export type IssueData = z.infer<typeof IssueSchema>;

export type RelationType = z.infer<typeof RelationTypeSchema>;

export type RelationData = z.infer<typeof RelationSchema>;

export type ViewData = z.infer<typeof ViewSchema>;

export type ViewIssuePositionData = z.infer<typeof ViewIssuePositionSchema>;

export type ModelData = {
  [K in (typeof ModelSchemas)[number] as K["shape"]["model"]["value"]]: z.infer<K>;
}[ModelName];

export type SetEvent<T extends ModelData> = {
  operation: "set";
  model: T["model"];
  id: string;
  oldProps: Omit<T, "id" | "model"> | null;
  newProps: Omit<T, "id" | "model"> | null;
};

type IssueSchemaProps = z.infer<typeof IssueSchema.shape.props>;

export type IssueUpdateEvent = {
  operation: "update";
  model: "issue";
  id: string;
  props: Partial<Omit<z.infer<typeof IssueSchema>, "id" | "model">>;
};

export type UpdateEventProps<T extends ModelData> = {
  [K in keyof Omit<T, "id" | "model">]?: { old: T[K]; new: T[K] };
};

export type UpdateEvent<T extends ModelData> = {
  operation: "update";
  model: T["model"];
  id: string;
  props: UpdateEventProps<T>;
};

export type CreateEvent<T extends ModelData> = {
  operation: "create";
  model: T["model"];
  id: string;
  props: Omit<T, "id" | "model">;
};

export type DeleteEvent<T extends ModelData> = {
  operation: "delete";
  model: T["model"];
  id: string;
  props: Omit<T, "id" | "model">;
};

export type Event<T extends ModelData> =
  | SetEvent<T>
  | UpdateEvent<T>
  | CreateEvent<T>
  | DeleteEvent<T>;

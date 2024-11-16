export type SerializedIssue = {
  id: string;
  title: string;
  projectId: string | null;
};

export type SerializedProject = {
  id: string;
  title: string;
};

export type SerializedRelation = {
  id: string;
  fromId: string | null;
  toId: string | null;
};

// Basic types
export type ModelName = "issue" | "relation" | "project";

export type Event =
  | {
      operation: "create";
      model: ModelName;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      operation: "update";
      model: ModelName;
      id: string;
      propKey: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      operation: "delete";
      model: ModelName;
      id: string;
      props?: Record<string, unknown>;
    };

import { Project, Issue } from "./test8";

export type ModelIssueProps = {
  title: string;
  project: Project | null;
  placeholder: boolean;
};

export type SerializedIssue = {
  id: string;
  title: string;
  projectId: string | null;
};

export type ModelProjectProps = {
  title: string;
  placeholder: boolean;
};

export type SerializedProject = {
  id: string;
  title: string;
};

export type ModelRelationProps = {
  from: Issue | null;
  to: Issue | null;
  placeholder: boolean;
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
    }
  | {
      // Used by sync/load to set a model to some state. It's not generated
      // by a client, so we don't e.g. track it.
      operation: "set";
      model: ModelName;
      id: string;
      oldProps: Record<string, unknown> | null;
      newProps: Record<string, unknown> | null;
    };

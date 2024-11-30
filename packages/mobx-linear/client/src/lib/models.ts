import { createContext } from "react";
import { property, backlinks, link, BaseModel, Store, updatedAt } from "./store";

class Issue extends BaseModel {
  @property()
  accessor title: string = "";

  @link()
  accessor project: Project | null = null;

  @property()
  accessor createdAt: number = Date.now();

  @updatedAt()
  accessor updatedAt: number = Date.now();

  @backlinks("relation.from")
  readonly relationsFrom = new Set<Relation>();

  @backlinks("relation.to")
  readonly relationsTo = new Set<Relation>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class Project extends BaseModel {
  @property()
  accessor title = "";

  @property()
  accessor createdAt = Date.now();

  @updatedAt()
  accessor updatedAt = Date.now();

  @backlinks("issue.project")
  readonly issues = new Set<Issue>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class Relation extends BaseModel {
  @link("issue")
  accessor from: Issue | null = null;

  @link("issue")
  accessor to: Issue | null = null;

  @property()
  accessor createdAt = Date.now();

  @updatedAt()
  accessor updatedAt = Date.now();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class IssueView extends BaseModel {
  @property()
  accessor query: "all" = "all";

  @property()
  accessor createdAt = Date.now();

  @updatedAt()
  accessor updatedAt = Date.now();

  @backlinks("issueViewPosition.parentView")
  readonly positions = new Set<IssueViewPosition>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }

  getAll() {
    if (!this.store) return [];
    const issues = this.store.getAll("issue") as Issue[];
    const positionsById = Array.from(this.positions).reduce<Record<string, string>>((acc, p) => {
      if (!p.issue) return acc;
      acc[p.issue.id] = p.position;
      return acc;
    }, {});
    return issues.map((issue) => ({
      issue,
      position: positionsById[issue.id] ?? createPosition(issue.createdAt),
    }));
  }
}

function createPosition(timestamp: number) {
  // Create a unique position string by combining a timestamp hash and fractional index
  const hash = timestamp.toString(36); // Convert timestamp to base36 for shorter hash
  return `${hash}_a0`; // a0 is the initial fractional index position
}

class IssueViewPosition extends BaseModel {
  @link("issue")
  accessor issue: Issue | null = null;

  @link("issueView")
  accessor parentView: IssueView | null = null;

  @property()
  accessor position: string = createPosition(Date.now());

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

export function createStore() {
  return new Store(
    {
      issue: Issue,
      project: Project,
      relation: Relation,
    },
    {
      puller: "/api/pull",
      pusher: "/api/push",
      poker: "ws://localhost:3000",
    }
  );
}

export type IssueType = Issue;

export type ProjectType = Project;

export type RelationType = Relation;

export const StoreContext = createContext<ReturnType<typeof createStore> | null>(null);

import { createContext } from "react";
import { property, backlinks, link, BaseModel, Store, updatedAt } from "./store";
import { action, computed } from "mobx";
import { createPosition } from "./position";

// TODO can probably define the store interface at the top and then
// provide it to the models so they know the types of the other models

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
  readonly issueViewPositions = new Set<IssueViewPosition>();

  @computed
  get issueViewPositionsById() {
    return Array.from(this.issueViewPositions).reduce<Record<string, IssueViewPosition>>(
      (acc, p) => {
        if (!p.issue) return acc;
        acc[p.issue.id] = p;
        return acc;
      },
      {}
    );
  }

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }

  @computed
  get issues() {
    if (!this.store) return [];
    return this.store.getAll("issue") as Issue[];
  }

  @action
  upsertPosition(issue: Issue, position: string) {
    if (!this.store) return;
    if (this.issueViewPositionsById[issue.id]) {
      this.issueViewPositionsById[issue.id].position = position;
    } else {
      this.store.create("issueViewPosition", {
        issueId: issue.id,
        parentViewId: this.id,
        position,
      });
    }
  }
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
      issueView: IssueView,
      issueViewPosition: IssueViewPosition,
    }
    // {
    //   puller: "/api/pull",
    //   pusher: "/api/push",
    //   poker: "ws://localhost:3000",
    // }
  );
}

export type IssueType = Issue;

export type ProjectType = Project;

export type RelationType = Relation;

export const StoreContext = createContext<ReturnType<typeof createStore> | null>(null);

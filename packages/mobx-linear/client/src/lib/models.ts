import { createContext } from "react";
import { Property, BaseModel, Store, Collection, Backlinks, Link } from "./store";
import { action, computed } from "mobx";
import { createPosition } from "./position";

// TODO can probably define the store interface at the top and then
// provide it to the models so they know the types of the other models

class Issue extends BaseModel {
  @Property()
  accessor title: string = "";

  @Property()
  accessor user: string = "";

  @Property()
  accessor labels: Label[] = [];

  @Property()
  accessor state: string = "";

  @Property()
  accessor body: string = "";

  @Link<Project>("issues")
  accessor project: Project | null = null;

  @Property()
  accessor createdAt: number = Date.now();

  @Property()
  accessor updatedAt: number = Date.now();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class Project extends BaseModel {
  @Property()
  accessor title = "";

  @Property()
  accessor createdAt = Date.now();

  @Property()
  accessor updatedAt = Date.now();

  @Backlinks()
  readonly issues = new Collection<Issue>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class IssueView extends BaseModel {
  @Property()
  accessor query: "all" = "all";

  @Property()
  accessor createdAt = Date.now();

  @Property()
  accessor updatedAt = Date.now();

  @Backlinks()
  readonly issueViewPositions = new Collection<IssueViewPosition>();

  @computed
  get issueViewPositionsById() {
    return Array.from(this.issueViewPositions).reduce<Record<string, IssueViewPosition>>(
      (acc, p) => {
        if (!p.issueId) return acc;
        acc[p.issueId] = p;
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
    if (!this._store) return [];
    return this._store.getAll("issue") as Issue[];
  }

  @action
  upsertPosition(issue: Issue, position: string) {
    if (!this._store) return;
    if (this.issueViewPositionsById[issue.id]) {
      this.issueViewPositionsById[issue.id].position = position;
    } else {
      this._store.create("issueViewPosition", {
        issueId: issue.id,
        parentViewId: this.id,
        position,
      });
    }
  }
}

class Label extends BaseModel {
  @Property()
  accessor name: string = "";

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class IssueViewPosition extends BaseModel {
  @Property()
  accessor issueId: string | null = null;

  @Link<IssueView>("issueViewPositions")
  accessor parentView: IssueView | null = null;

  @Property()
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
      issueView: IssueView,
      issueViewPosition: IssueViewPosition,
      label: Label,
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

export const StoreContext = createContext<ReturnType<typeof createStore> | null>(null);

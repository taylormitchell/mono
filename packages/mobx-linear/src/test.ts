import { action, makeObservable, observable, reaction, runInAction, toJS } from "mobx";

type Update = {
  operation: "update";
  model: ModelName;
  id: string;
  oldProps: Record<string, any>;
  newProps: Record<string, any>;
};

type Create = {
  operation: "create";
  model: ModelName;
  id: string;
  props: Record<string, any>;
};

type Delete = {
  operation: "delete";
  model: ModelName;
  id: string;
};

type Event = Update | Create | Delete;

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  relations: Map<string, RelationModel> = new Map();
  trackingChanges: boolean = true;

  // TODO rather than calling `commit` or something, can mobx autocommit for me after an action completes?
  // I *think* reactions delay running until an entire action completes, so if processing the changes is
  // done instead an action, will that autocommit it?
  uncommittedChanges: Event[] = [];
  // Using an observable number to trigger a reaction b/c if we track the change array,
  // the reaction will need to modify it too (clear it) which you're not supposed to do
  // inside reactions.
  changeCount: number = 0;

  constructor() {
    makeObservable(this, {
      changeCount: observable,
      loadProject: action,
      loadIssue: action,
      createIssue: action,
      createProject: action,
      loadRelation: action,
    });
    reaction(
      () => this.changeCount,
      () => {
        console.log(toJS(this.uncommittedChanges.slice().map((v) => toJS(v))));
        this.uncommittedChanges = [];
      }
    );
  }

  addChange(change: Event) {
    if (this.trackingChanges) {
      this.changeCount++;
      this.uncommittedChanges.push(change);
    }
  }

  loadProject(project: Project) {
    this.trackingChanges = false;
    let model = this.projects.get(project.id);
    if (model) {
      model.populatePlaceholder(project);
    } else {
      model = new ProjectModel(this, project.id, project);
      this.projects.set(project.id, model);
    }
    this.trackingChanges = true;
    return model;
  }

  loadIssue(issue: IssueData) {
    this.trackingChanges = false;
    // Get project
    let project: ProjectModel | null = null;
    if (issue.projectId) {
      project = this.projects.get(issue.projectId) ?? null;
      if (!project) {
        project = ProjectModel.createPlaceholder(this, issue.projectId);
        this.projects.set(issue.projectId, project);
      }
    }
    // Create/populate issue model
    let model = this.issues.get(issue.id);
    if (model) {
      model.populatePlaceholder({ ...issue, project });
    } else {
      model = new IssueModel(this, issue.id, { ...issue, project });
      this.issues.set(issue.id, model);
    }
    this.trackingChanges = true;
    return model;
  }

  loadRelation(relation: RelationData) {
    this.trackingChanges = false;
    let model = this.relations.get(relation.id);
    if (model) {
      model.populatePlaceholder(relation);
    } else {
      // TODO feels like a lot of fiddly work to remember to do. but maybe it's fine?
      const fromIssue =
        this.issues.get(relation.fromId) || IssueModel.createPlaceholder(this, relation.fromId);
      const toIssue =
        this.issues.get(relation.toId) || IssueModel.createPlaceholder(this, relation.toId);
      if (!this.issues.has(relation.fromId)) {
        this.issues.set(relation.fromId, fromIssue);
      }
      if (!this.issues.has(relation.toId)) {
        this.issues.set(relation.toId, toIssue);
      }
      model = new RelationModel(this, relation.id, {
        from: fromIssue,
        to: toIssue,
        placeholder: false,
      });
      this.relations.set(relation.id, model);
    }
    this.trackingChanges = true;
    return model;
  }

  createIssue(id: string, props: Partial<IssueState>) {
    if (this.issues.has(id)) {
      throw new Error(`Issue with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const issue = new IssueModel(this, id, props);
    this.trackingChanges = true;
    // TODO maybe this should be done inside the constructor?
    this.issues.set(id, issue);
    this.addChange({ operation: "create", model: "issue", id, props: serializeState(props) });
    return issue;
  }

  createProject(id: string, props: Partial<ProjectState>) {
    if (this.projects.has(id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const project = new ProjectModel(this, id, props);
    this.trackingChanges = true;
    this.projects.set(id, project);
    this.addChange({ operation: "create", model: "project", id, props: serializeState(props) });
    return project;
  }

  createRelation(
    id: string,
    props: Omit<RelationState, "placeholder"> & { placeholder?: boolean }
  ) {
    if (this.relations.has(id)) {
      throw new Error(`Relation with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const relation = new RelationModel(this, id, props);
    this.trackingChanges = true;
    this.relations.set(id, relation);
    this.addChange({
      operation: "create",
      model: "relation",
      id,
      props: serializeState(props),
    });
    return relation;
  }
}

type ModelName = "issue" | "project" | "relation";

abstract class BaseModel {
  abstract id: string;
  abstract store: Store;
  abstract name: ModelName;
}

type Model = IssueModel | ProjectModel | RelationModel;
function isModel(value: unknown): value is Model {
  return (
    value instanceof IssueModel || value instanceof ProjectModel || value instanceof RelationModel
  );
}

type Project = {
  id: string;
  title: string;
};

type IssueData = {
  id: string;
  projectId: string | null;
  title: string;
};

type IssueState = {
  project: ProjectModel | null;
  placeholder: boolean;
  relations: Set<RelationModel>;
};

class IssueModel implements BaseModel {
  readonly name = "issue";
  store: Store;
  id: string;
  // todo maybe something like this makes it easier to track changes
  // on all props. then I have fancy getters and setters on the class
  // instance which do compound operations like setProjectAndAddToCollection
  // TODO semi private state. better way?
  _state: IssueState;

  constructor(
    store: Store,
    id: string,
    { project = null, placeholder = false, relations = new Set() }: Partial<IssueState>
  ) {
    this.store = store;
    this.id = id;
    this._state = makeTracking({ project, placeholder, relations }, this);
    moveIssueToProject(this, project);
  }

  get placeholder() {
    return this._state.placeholder;
  }

  get project() {
    return this._state.project;
  }

  set project(project: ProjectModel | null) {
    moveIssueToProject(this, project);
  }

  get relations() {
    return this._state.relations.values();
  }

  static createPlaceholder(store: Store, id: string) {
    return new IssueModel(store, id, { project: null, placeholder: true });
  }

  populatePlaceholder(props: Partial<IssueState>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder issue");
    }
    Object.assign(this._state, props);
    this._state.placeholder = false;
  }
}

function moveIssueToProject(issue: IssueModel, project: ProjectModel | null) {
  if (issue._state.project) {
    issue._state.project._state.issues.delete(issue);
  }
  issue._state.project = project;
  if (project) {
    project._state.issues.add(issue);
  }
}

function updateRelationIssues(
  relation: RelationModel,
  { from, to }: { from?: IssueModel; to?: IssueModel }
) {
  if (from !== undefined) {
    const oldFrom = relation._state.from;
    oldFrom._state.relations.delete(relation);
    relation._state.from = from;
    from._state.relations.add(relation);
  }
  if (to !== undefined) {
    const oldTo = relation._state.to;
    oldTo._state.relations.delete(relation);
    relation._state.to = to;
    to._state.relations.add(relation);
  }
}

type ProjectData = {
  id: string;
  title: string;
};

type ProjectState = {
  title: string;
  placeholder: boolean;
  issues: Set<IssueModel>;
};

class ProjectModel implements BaseModel {
  readonly name = "project";
  store: Store;
  id: string;
  /**
   * For now, we're using _ prefix for private-by-convention fields. These are still accessible
   * but should only be used internally. Later I'd like to find a clean way to do this while
   * making it actually private, but this is easier for now.
   *
   * Why put here an not a seperate model on store?
   * it's nice to have this on the model itself, rather than a issuesByProjectId collection
   * can then we know it always exists
   */
  _state: ProjectState;

  constructor(store: Store, id: string, { title, placeholder = false }: Partial<ProjectState>) {
    this.store = store;
    this.id = id;
    this._state = makeTracking(
      { title: title || "", placeholder, issues: new Set<IssueModel>() },
      this
    );
  }

  get title() {
    return this._state.title;
  }

  set title(value: string) {
    this._state.title = value;
  }

  get placeholder() {
    return this._state.placeholder;
  }

  set placeholder(value: boolean) {
    this._state.placeholder = value;
  }

  static createPlaceholder(store: Store, id: string) {
    return new ProjectModel(store, id, { title: "unknown", placeholder: true });
  }

  populatePlaceholder(props: Partial<ProjectState>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder project");
    }
    Object.assign(this._state, props);
    this._state.placeholder = false;
  }

  getIssues() {
    return this._state.issues.values();
  }

  addIssue(issue: IssueModel) {
    moveIssueToProject(issue, this);
  }

  removeIssue(issue: IssueModel) {
    moveIssueToProject(issue, null);
  }
}

function isKeyOf<T extends Record<string, any>>(prop: unknown, obj: T): prop is keyof T & string {
  return typeof prop === "string" && prop in obj;
}

function makeTracking<T extends Record<string, any>>(initialState: T, model: BaseModel): T {
  return new Proxy(initialState, {
    set: (target, prop, value) => {
      if (isKeyOf(prop, target)) {
        const oldProps = serializeState({ [prop]: target[prop] });
        const newProps = serializeState({ [prop]: value });
        model.store.addChange({
          operation: "update",
          model: model.name,
          id: model.id,
          oldProps,
          newProps,
        });
        (target as any)[prop] = value;
      }
      return true;
    },
  });
}

function serializeState(state: Record<string, any>) {
  const serialized: Record<string, any> = {};
  for (const key in state) {
    if (isModel(state[key])) {
      serialized[`${key}Id`] = state[key].id;
    } else {
      serialized[key] = state[key];
    }
  }
  return serialized;
}

type RelationType = "related-to" | "blocks";

type RelationData = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
};

type RelationState = {
  from: IssueModel;
  to: IssueModel;
  placeholder: boolean;
};

class RelationModel implements BaseModel {
  readonly name = "relation";
  store: Store;
  id: string;
  _state: RelationState;

  constructor(
    store: Store,
    id: string,
    { from, to, placeholder = false }: Partial<RelationState> & { from: IssueModel; to: IssueModel }
  ) {
    this.store = store;
    this.id = id;
    this._state = makeTracking({ from, to, placeholder }, this);
    updateRelationIssues(this, { from, to });
  }

  get from(): IssueModel {
    return this._state.from;
  }

  set from(issue: IssueModel) {
    updateRelationIssues(this, { from: issue });
  }

  get to(): IssueModel {
    return this._state.to;
  }

  set to(issue: IssueModel) {
    updateRelationIssues(this, { to: issue });
  }

  get placeholder(): boolean {
    return this._state.placeholder;
  }

  static createPlaceholder(
    store: Store,
    id: string,
    from: IssueModel,
    to: IssueModel
  ): RelationModel {
    return new RelationModel(store, id, { from, to, placeholder: true });
  }

  populatePlaceholder(data: RelationData) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder relation");
    }
    Object.assign(this._state, data);
    this._state.placeholder = false;
  }
}

function test() {
  const store = new Store();

  const relation1 = store.loadRelation({ id: "1", fromId: "1", toId: "2", type: "related-to" });
  const issue1 = store.loadIssue({ id: "1", projectId: "1", title: "Issue 1" });
  const issue2 = store.loadIssue({ id: "2", projectId: "1", title: "Issue 2" });
  const issue3 = store.loadIssue({ id: "3", projectId: "1", title: "Issue 3" });
  const project1 = store.loadProject({ id: "1", title: "Project 1" });
  const project2 = store.loadProject({ id: "2", title: "Project 2" });

  runInAction(() => {
    issue1.project = project2;
    issue2.project = project2;
    project1.title = "Project 1 (updated)";
    project2.removeIssue(issue1);
  });

  runInAction(() => {
    store.createProject("3", { title: "Project 3", placeholder: false });
  });

  runInAction(() => {
    relation1.to = issue3;
    const relation2 = store.createRelation("2", { from: issue1, to: issue3 });
  });
}

test();

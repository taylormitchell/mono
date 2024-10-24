import { action, makeObservable, observable, reaction, runInAction, toJS } from "mobx";

type Update = {
  operation: "update";
  model: "project" | "issue";
  id: string;
  oldProps: Record<string, any>;
  newProps: Record<string, any>;
};

type Create = {
  operation: "create";
  model: "project" | "issue";
  id: string;
  props: Record<string, any>;
};

type Delete = {
  operation: "delete";
  model: "project" | "issue";
  id: string;
};

type Action = Update | Create | Delete;

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  trackingChanges: boolean = true;
  //   relations: Map<string, RelationModel> = new Map();

  // TODO rather than calling `commit` or something, can mobx autocommit for me after an action completes?
  // I *think* reactions delay running until an entire action completes, so if processing the changes is
  // done instead an action, will that autocommit it?
  uncommittedChanges: Action[] = [];
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
    });
    reaction(
      () => this.changeCount,
      () => {
        console.log(toJS(this.uncommittedChanges.slice().map((v) => toJS(v))));
        this.uncommittedChanges = [];
      }
    );
  }

  addChange(change: Action) {
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
}

type ModelName = "issue" | "project";

abstract class BaseModel {
  abstract id: string;
  abstract store: Store;
  abstract name: ModelName;
}

type Model = IssueModel | ProjectModel;
function isModel(value: unknown): value is Model {
  return value instanceof IssueModel || value instanceof ProjectModel;
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
    { project = null, placeholder = false }: Partial<IssueState>
  ) {
    this.store = store;
    this.id = id;
    this._state = makeTracking({ project, placeholder }, this);
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

  static createPlaceholder(store: Store, id: string) {
    return new IssueModel(store, id, { project: null, placeholder: true });
  }

  populatePlaceholder(props: Partial<IssueState>) {
    Object.assign(this._state, props);
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
    Object.assign(this._state, props);
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

// class RelationModel implements Model {
//   store: Store;
//   placeholder: boolean;
//   id: string;
//   source: IssueModel;
//   target: IssueModel;
//   type: RelationType;
//   updatedAt: Date;
//   createdAt: Date;
//   sourceIssues: Collection<IssueModel>;
//   targetIssues: Collection<IssueModel>;

//   constructor(
//     store: Store,
//     {
//       id,
//       from,
//       to,
//       type,
//       createdAt = new Date(),
//       updatedAt = new Date(),
//       placeholder = false,
//     }: {
//       id: string;
//       from: IssueModel;
//       to: IssueModel;
//       type: RelationType;
//       createdAt?: Date;
//       updatedAt?: Date;
//       placeholder?: boolean;
//     }
//   ) {
//     this.store = store;
//     this.id = id;
//     this.source = from;
//     this.target = to;
//     this.type = type;
//     this.createdAt = createdAt;
//     this.updatedAt = updatedAt;
//     this.placeholder = placeholder;
//     this.sourceIssues = new Collection<IssueModel>(store, id);
//     this.targetIssues = new Collection<IssueModel>(store, id);
//   }

//   assign({
//     id,
//     from,
//     to,
//     type,
//     createdAt,
//     updatedAt,
//     placeholder,
//   }: {
//     id: string;
//     from: IssueModel;
//     to: IssueModel;
//     type: RelationType;
//     createdAt: Date;
//     updatedAt: Date;
//     placeholder: boolean;
//   }) {
//     this.id = id;
//     this.source = from;
//     this.target = to;
//     this.type = type;
//     this.createdAt = createdAt;
//     this.updatedAt = updatedAt;
//     this.placeholder = placeholder;
//   }
// }

function test() {
  const store = new Store();

  const issue1 = store.loadIssue({ id: "1", projectId: "1", title: "Issue 1" });
  const issue2 = store.loadIssue({ id: "2", projectId: "1", title: "Issue 2" });
  const project1 = store.loadProject({ id: "1", title: "Project 1" });
  const project2 = store.loadProject({ id: "2", title: "Project 2" });

  runInAction(() => {
    issue1.project = project2;
    issue2.project = project2;
    project1.title = "Project 1 (updated)";
    project2.removeIssue(issue1);
  });

  runInAction(() => {
    store.createIssue("3", { project: project1, placeholder: false });
    store.createProject("3", { title: "Project 3", placeholder: false });
  });
}

test();

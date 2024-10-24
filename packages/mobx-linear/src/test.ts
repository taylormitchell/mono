import { autorun, observable, runInAction, toJS } from "mobx";

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
  uncommittedChanges: Action[] = observable.array();

  constructor() {
    // makeObservable(this, {
    //   uncommittedChanges: observable.shallow,
    // });
    autorun(() => {
      console.log(toJS(this.uncommittedChanges.slice().map((v) => toJS(v))));
    });
  }

  addChange(change: Action) {
    if (this.trackingChanges) {
      this.uncommittedChanges.push(change);
    }
  }

  loadProject(project: Project) {
    let model = this.projects.get(project.id);
    if (model) {
      model.populatePlaceholder(project);
    } else {
      model = new ProjectModel(this, project);
      this.projects.set(project.id, model);
    }
    return model;
  }

  loadIssue(issue: Issue) {
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
      model = new IssueModel(this, { ...issue, project });
      this.issues.set(issue.id, model);
    }
    // Add to project collection
    // if (project) {
    //   // should this be done inside the issue model?
    //   project._issues.add(model);
    // }
    return model;
  }
}

abstract class Model {
  abstract id: string;
  abstract store: Store;
}

type Project = {
  id: string;
  title: string;
};

type Issue = {
  id: string;
  projectId: string | null;
  title: string;
};

class IssueModel implements Model {
  store: Store;
  _project: ProjectModel | null = null;
  // todo maybe something like this makes it easier to track changes
  // on all props. then I have fancy getters and setters on the class
  // instance which do compound operations like setProjectAndAddToCollection
  private state: {
    id: string;
    project: ProjectModel | null;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    {
      id,
      project,
      placeholder = false,
    }: { id: string; project: ProjectModel | null; placeholder?: boolean }
  ) {
    this.store = store;
    this.state = new Proxy(
      { id, project, placeholder },
      {
        set: (target, prop, value) => {
          store.addChange({
            operation: "update",
            model: "issue",
            id,
            oldProps: { [prop as string]: target[prop as keyof typeof target] },
            newProps: { [prop]: value },
          });
          target[prop as keyof typeof target] = value;
          return true;
        },
      }
    );
    this._project = this.setProjectAndAddToCollection(project);
  }

  get id() {
    return this.state.id;
  }

  get placeholder() {
    return this.state.placeholder;
  }

  private setProjectAndAddToCollection(project: ProjectModel | null) {
    if (this._project) {
      this._project._issues.delete(this);
    }
    this._project = project;
    if (project) {
      project._issues.add(this);
    }
    return project;
  }

  get project() {
    return this._project;
  }

  set project(project: ProjectModel | null) {
    this.setProjectAndAddToCollection(project);
    this.store.addChange({
      operation: "update",
      model: "issue",
      id: this.id,
      oldProps: { project: this._project },
      newProps: { project },
    });
  }

  static createPlaceholder(store: Store, id: string) {
    return new IssueModel(store, { id, project: null, placeholder: true });
  }

  populatePlaceholder(props: { id: string; project: ProjectModel | null; title: string }) {
    this.id = props.id;
    this._project = props.project;
    this.placeholder = true;
  }
}

function setProjectAndAddToCollection(
  store: Store,
  issue: IssueModel,
  project: ProjectModel | null
) {
  if (issue._project) {
    issue._project._issues.delete(issue);
  }
  issue._project = project;
  if (project) {
    project._issues.add(issue);
  }
  store.addChange({
    operation: "update",
    model: "issue",
    id: issue.id,
    oldProps: { project: issue._project },
    newProps: { project },
  });
  return { project, issue };
}

class ProjectModel implements Model {
  store: Store;
  id: string;
  title: string;
  /**
   * For now, we're using _ prefix for private-by-convention fields. These are still accessible
   * but should only be used internally. Later I'd like to find a clean way to do this while
   * making it actually private, but this is easier for now.
   *
   * Why put here an not a seperate model on store?
   * it's nice to have this on the model itself, rather than a issuesByProjectId collection
   * can then we know it always exists
   */
  _issues: Set<IssueModel>;
  placeholder: boolean;

  constructor(
    store: Store,
    { id, title, placeholder = false }: { id: string; title: string; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this.title = title;
    this.placeholder = placeholder;
    this._issues = new Set();
  }

  populatePlaceholder({
    id,
    title,
    placeholder = false,
  }: {
    id: string;
    title: string;
    placeholder?: boolean;
  }) {
    this.id = id;
    this.title = title;
    this.placeholder = placeholder;
  }

  static createPlaceholder(store: Store, id: string) {
    return new ProjectModel(store, { id, title: "unknown", placeholder: true });
  }

  getIssues() {
    return this._issues.values();
  }
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

  store.loadIssue({ id: "1", projectId: "1", title: "Issue 1" });
  store.loadIssue({ id: "2", projectId: "1", title: "Issue 2" });
  store.loadProject({ id: "1", title: "Project 1" });
  store.loadProject({ id: "2", title: "Project 2" });

  runInAction(() => {
    const issue1 = store.issues.get("1");
    if (issue1) {
      issue1.project = store.projects.get("2") ?? null;
    }
    const issue2 = store.issues.get("2");
    if (issue2) {
      issue2.project = store.projects.get("1") ?? null;
    }
  });
}

test();

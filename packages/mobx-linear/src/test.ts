type Update = {
  type: "update";
  oldProps: Record<string, any>;
  newProps: Record<string, any>;
};

type Create = {
  type: "create";
  props: Record<string, any>;
};

type Delete = {
  type: "delete";
  id: string;
};

type Action = Update | Create | Delete;

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  //   relations: Map<string, RelationModel> = new Map();

  // TODO rather than calling `commit` or something, can mobx autocommit for me after an action completes?
  // I *think* reactions delay running until an entire action completes, so if processing the changes is
  // done instead an action, will that autocommit it?
  uncommittedChanges: Action[] = [];

  //   loadRelation(relation: Relation) {
  //     // Get source and target issues
  //     let from = this.issues.get(relation.fromId);
  //     let to = this.issues.get(relation.toId);
  //     if (!from) {
  //       from = new IssueModel(this, { id: relation.fromId, project: null });
  //       this.issues.set(relation.fromId, from);
  //     }
  //     if (!to) {
  //       to = new IssueModel(this, { id: relation.toId, project: null });
  //       this.issues.set(relation.toId, to);
  //     }
  //     // Create/populate relation model
  //     let relationModel = this.relations.get(relation.id);
  //     if (relationModel) {
  //       relationModel.assign({ ...relation, from, to, placeholder: false });
  //     } else {
  //       relationModel = new RelationModel(this, { ...relation, from, to });
  //       this.relations.set(relation.id, relationModel);
  //     }
  //     // Add to collections
  //     from.relations.add(relationModel);
  //     to.relations.add(relationModel);
  //     relationModel.sourceIssues.add(from);
  //     relationModel.targetIssues.add(to);
  //   }

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
    if (project) {
      // should this be done inside the issue model?
      project._issues.add(model);
    }
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

type RelationType = "related" | "blocks";

type Relation = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
  createdAt: Date;
  updatedAt: Date;
};

class IssueModel implements Model {
  store: Store;
  id: string;
  //   relations: Set<RelationModel>;
  private _project: ProjectModel | null;
  placeholder: boolean;

  constructor(
    store: Store,
    {
      id,
      project,
      placeholder = false,
    }: { id: string; project: ProjectModel | null; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._project = project;
    this.placeholder = placeholder;
    // this.relations = new Collection<RelationModel>(store, id);
  }

  get project() {
    return this._project;
  }

  set project(project: ProjectModel | null) {
    if (this._project) {
      this._project._issues.delete(this);
    }
    this._project = project;
    if (project) {
      project._issues.add(this);
    }
    this.store.uncommittedChanges.push({
      type: "update",
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

  // Load relation before we have the connected issues
  //   store.loadRelation({
  //     id: "rel1",
  //     fromId: "1",
  //     toId: "2",
  //     type: "blocks",
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //   });

  store.loadIssue({ id: "1", projectId: "1", title: "Issue 1" });
  store.loadIssue({ id: "2", projectId: "1", title: "Issue 2" });
  store.loadProject({ id: "1", title: "Project 1" });
  store.loadProject({ id: "2", title: "Project 2" });

  // Verify that the relations are correctly established
  //   const relation = store.relations.get("rel1");
  //   console.assert(relation?.source.id === "1", "Relation should have from issue 1");
  //   console.assert(relation?.target.id === "2", "Relation should have to issue 2");

  const issue1 = store.issues.get("1");
  if (issue1) {
    issue1.project = store.projects.get("2") ?? null;
  }
  console.assert(issue1?.project?.id === "2", "Issue 1 should be assigned to project 2");
}

test();

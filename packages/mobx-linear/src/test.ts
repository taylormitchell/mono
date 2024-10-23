import { generateKeyBetween } from "fractional-indexing";

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
  relations: Map<string, RelationModel> = new Map();

  // TODO rather than calling `commit` or something, can mobx autocommit for me after an action completes?
  // I *think* reactions delay running until an entire action completes, so if processing the changes is
  // done instead an action, will that autocommit it?
  uncommittedChanges: Action[] = [];

  loadRelation(relation: Relation) {
    // Get source and target issues
    let from = this.issues.get(relation.fromId);
    let to = this.issues.get(relation.toId);
    if (!from) {
      from = new IssueModel(this, { id: relation.fromId, project: null });
      this.issues.set(relation.fromId, from);
    }
    if (!to) {
      to = new IssueModel(this, { id: relation.toId, project: null });
      this.issues.set(relation.toId, to);
    }
    // Create/populate relation model
    let relationModel = this.relations.get(relation.id);
    if (relationModel) {
      relationModel.assign({ ...relation, from, to, placeholder: false });
    } else {
      relationModel = new RelationModel(this, { ...relation, from, to });
      this.relations.set(relation.id, relationModel);
    }
    // Add to collections
    from.relations.add(relationModel);
    to.relations.add(relationModel);
    relationModel.sourceIssues.add(from);
    relationModel.targetIssues.add(to);
  }

  loadProject(project: Project) {
    let model = this.projects.get(project.id);
    if (model) {
      model.assign(project);
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
      model.assign({ ...issue, project });
    } else {
      model = new IssueModel(this, { ...issue, project });
      this.issues.set(issue.id, model);
    }
    // Add to project collection
    // if (project) {
    //   project.issues.add(model);
    // }
    // No need to add to relations collection, as it's done in loadRelation
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

// TODO Not sure about trying to enforce the one-to-many relationship be
// defined implicitely throught foreign key *and* as a link table (name?).
// I'm thinking maybe the link table doesn't guarantee contraint and just
// assigns position
class Collection<T extends Model> {
  id: string;
  store: Store;
  items: Map<T, string> = new Map();
  constructor(store: Store, id: string) {
    this.store = store;
    this.id = id;
  }

  firstPosition() {
    if (this.items.size === 0) {
      return null;
    }
    let minPosition: string | null = null;
    for (const position of this.items.values()) {
      if (minPosition === null || position < minPosition) {
        minPosition = position;
      }
    }
    return minPosition;
  }

  add(item: T, position?: string) {
    if (this.items.has(item)) {
      throw new Error(`Item ${item} already exists in collection ${this.id}`);
    }
    position = position ?? generateKeyBetween(this.firstPosition(), null);
    this.items.set(item, position);
    this.store.uncommittedChanges.push({
      type: "create",
      props: { collectionId: this.id, issuedId: item.id, position },
    });
  }

  delete(item: T) {
    this.items.delete(item);
    this.store.uncommittedChanges.push({
      type: "delete",
      id: item.id,
    });
  }
}

class IssueModel implements Model {
  store: Store;
  id: string;
  relations: Collection<RelationModel>;
  project: ProjectModel | null;
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
    this.project = project;
    this.placeholder = placeholder;
    this.relations = new Collection<RelationModel>(store, id);
    this.makeTracked();
  }

  makeTracked() {
    let _project = this.project;
    Object.defineProperty(this, "project", {
      get: () => _project,
      set: (v) => {
        if (this.project) {
          this.project.issues.delete(this);
        }
        _project = v;
        if (v) {
          v.issues.add(this);
        }
        this.store.uncommittedChanges.push({
          type: "update",
          oldProps: { project: _project },
          newProps: { project: v },
        });
      },
    });
  }

  assign({
    id,
    project,
    placeholder = false,
  }: {
    id: string;
    project: ProjectModel | null;
    placeholder?: boolean;
  }) {
    this.id = id;
    this.project = project;
    this.placeholder = placeholder;
  }
}

// TODO this can probably be generalized
// defining this outside the class feels right
function assignIssueToProject(issue: IssueModel, project: ProjectModel | null) {
  if (issue.project) {
    issue.project.issues.delete(issue);
  }
  issue.project = project;
  if (project) {
    project.issues.add(issue);
  }
}

class ProjectModel implements Model {
  store: Store;
  id: string;
  title: string;
  issues: Collection<IssueModel>;
  placeholder: boolean;

  constructor(
    store: Store,
    { id, title, placeholder = false }: { id: string; title: string; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this.title = title;
    this.placeholder = placeholder;
    this.issues = new Collection<IssueModel>(store, id);
  }

  assign({ id, title, placeholder = false }: { id: string; title: string; placeholder?: boolean }) {
    this.id = id;
    this.title = title;
    this.placeholder = placeholder;
  }

  static createPlaceholder(store: Store, id: string) {
    return new ProjectModel(store, { id, title: "unknown", placeholder: true });
  }
}

class RelationModel implements Model {
  store: Store;
  placeholder: boolean;
  id: string;
  source: IssueModel;
  target: IssueModel;
  type: RelationType;
  updatedAt: Date;
  createdAt: Date;

  sourceIssues: Collection<IssueModel>;
  targetIssues: Collection<IssueModel>;

  constructor(
    store: Store,
    {
      id,
      from,
      to,
      type,
      createdAt = new Date(),
      updatedAt = new Date(),
      placeholder = false,
    }: {
      id: string;
      from: IssueModel;
      to: IssueModel;
      type: RelationType;
      createdAt?: Date;
      updatedAt?: Date;
      placeholder?: boolean;
    }
  ) {
    this.store = store;
    this.id = id;
    this.source = from;
    this.target = to;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.placeholder = placeholder;
    this.sourceIssues = new Collection<IssueModel>(store, id);
    this.targetIssues = new Collection<IssueModel>(store, id);
  }

  assign({
    id,
    from,
    to,
    type,
    createdAt,
    updatedAt,
    placeholder,
  }: {
    id: string;
    from: IssueModel;
    to: IssueModel;
    type: RelationType;
    createdAt: Date;
    updatedAt: Date;
    placeholder: boolean;
  }) {
    this.id = id;
    this.source = from;
    this.target = to;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.placeholder = placeholder;
  }
}

function trackProperty<T extends Model>(target: T, key: keyof T, value: any) {
  let _value = value;
  Object.defineProperty(target, key, {
    get: () => _value,
    set: (v) => {
      target.store.uncommittedChanges.push({
        type: "update",
        oldProps: { [key]: _value },
        newProps: { [key]: v },
      });
      _value = v;
    },
  });
  return _value;
}

function test() {
  const store = new Store();

  // Load relation before we have the connected issues
  store.loadRelation({
    id: "rel1",
    fromId: "1",
    toId: "2",
    type: "blocks",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  store.loadIssue({ id: "1", projectId: "1", title: "Issue 1" });
  store.loadIssue({ id: "2", projectId: "1", title: "Issue 2" });
  store.loadProject({ id: "1", title: "Project 1" });
  store.loadProject({ id: "2", title: "Project 2" });

  // Verify that the relations are correctly established
  const relation = store.relations.get("rel1");
  console.assert(relation?.source.id === "1", "Relation should have from issue 1");
  console.assert(relation?.target.id === "2", "Relation should have to issue 2");

  const issue1 = store.issues.get("1");
  if (issue1) {
    issue1.project = store.projects.get("2") ?? null;
  }
  console.assert(issue1?.project?.id === "2", "Issue 1 should be assigned to project 2");
}

test();

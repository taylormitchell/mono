import { reaction, runInAction, makeAutoObservable, autorun, toJS } from "mobx";
import {
  ModelName,
  Event,
  IssueData,
  IssueSchema,
  IssueProps,
  ProjectData,
  ProjectProps,
  ProjectSchema,
  RelationData,
  RelationSchema,
  RelationProps,
  RelationPropsSchema,
} from "./types";
import { z } from "zod";

function reverseEvent(event: Event): Event {
  switch (event.operation) {
    case "create":
      switch (event.model) {
        case "project":
          return { operation: "delete", model: "project", id: event.id, props: event.props };
        case "issue":
          return { operation: "delete", model: "issue", id: event.id, props: event.props };
        case "relation":
          return { operation: "delete", model: "relation", id: event.id, props: event.props };
      }
      break;
    case "update":
      return {
        operation: "update",
        model: event.model,
        id: event.id,
        oldProps: event.newProps,
        newProps: event.oldProps,
      };
    case "delete":
      return {
        operation: "update",
        model: event.model,
        id: event.id,
        oldProps: event.props,
        newProps: event.props,
      };
    case "set":
      switch (event.model) {
        case "project":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        case "issue":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        case "relation":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        default:
          return event satisfies never;
      }
  }
}

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  relations: Map<string, RelationModel> = new Map();
  private trackingChanges: boolean = true;

  undoStack: Event[][] = [];
  redoStack: Event[][] = [];

  uncommittedChanges: Event[] = [];
  // Using an observable number to trigger a reaction b/c if we track the change array,
  // the reaction will need to modify it too (clear it) which you're not supposed to do
  // inside reactions.
  // TODO not sure about this. sketch I need to do it in applyUntrackedChange?
  changeCount: number = 0;

  constructor() {
    makeAutoObservable(this, {
      uncommittedChanges: false,
    });
    reaction(
      () => this.changeCount,
      () => {
        // console.log(this.uncommittedChanges.map((e) => toJS(e)));
        this.undoStack.push(this.uncommittedChanges.slice());
        this.redoStack = [];
        this.uncommittedChanges = [];
      }
    );
  }

  undo() {
    const events = this.undoStack.pop();
    if (events) {
      const reversedEvents = events.reverse().map(reverseEvent);
      for (const event of reversedEvents) {
        this.applyChange(event);
      }
      this.changeCount++;
      this.redoStack.push(reversedEvents);
    }
  }

  redo() {
    const events = this.redoStack.pop();
    if (events) {
      for (const event of events) {
        this.applyChange(event);
      }
      this.changeCount++;
      this.undoStack.push(events);
    }
  }

  addChange(change: Event) {
    if (this.trackingChanges) {
      this.changeCount++;
      this.uncommittedChanges.push(change);
    }
  }

  private applyRemoteChange(change: Event) {
    this.trackingChanges = false;
    try {
      this.applyChange(change);
    } finally {
      this.trackingChanges = true;
    }
  }

  /**
  /**
   * @throws if a referenced model does not exist
   */
  private applyChange(change: Event) {
    switch (change.operation) {
      case "create":
        switch (change.model) {
          case "project":
            ProjectModel.create(this, change.id, ProjectModel.deserializeProps(this, change.props));
            break;
          case "issue":
            IssueModel.create(this, change.id, IssueModel.deserializeProps(this, change.props));
            break;
          case "relation":
            RelationModel.create(
              this,
              change.id,
              RelationModel.deserializeProps(this, change.props)
            );
            break;
        }
        break;
      case "update":
        switch (change.model) {
          case "project": {
            const project = ProjectModel.getOrThrow(this, change.id);
            project.update(ProjectModel.deserializePartialProps(this, change.newProps));
            break;
          }
          case "issue": {
            const issue = IssueModel.getOrThrow(this, change.id);
            issue.update(IssueModel.deserializePartialProps(this, change.newProps));
            break;
          }
          case "relation": {
            const relation = RelationModel.getOrThrow(this, change.id);
            relation.update(RelationModel.deserializePartialProps(this, change.newProps));
            break;
          }
        }
        break;
      case "delete":
        switch (change.model) {
          case "project":
            ProjectModel.getOrThrow(this, change.id).delete();
            break;
          case "issue":
            IssueModel.getOrThrow(this, change.id).delete();
            break;
          case "relation":
            RelationModel.getOrThrow(this, change.id).delete();
            break;
        }
        break;
      case "set":
        switch (change.model) {
          case "project": {
            if (change.newProps === null) {
              ProjectModel.getOrThrow(this, change.id).delete();
            } else {
              ProjectModel.set(this, { model: "project", id: change.id, props: change.newProps });
            }
            break;
          }
          case "issue": {
            if (change.newProps === null) {
              IssueModel.getOrThrow(this, change.id).delete();
            } else {
              IssueModel.set(this, { model: "issue", id: change.id, props: change.newProps });
            }
            break;
          }
          case "relation": {
            if (change.newProps === null) {
              RelationModel.getOrThrow(this, change.id).delete();
            } else {
              RelationModel.set(this, { model: "relation", id: change.id, props: change.newProps });
            }
            break;
          }
        }
        break;
      default:
        change satisfies never;
    }
  }

  load({
    projects = [],
    issues = [],
    relations = [],
  }: {
    projects?: ProjectData[];
    issues?: IssueData[];
    relations?: RelationData[];
  }) {
    this.trackingChanges = false;
    try {
      for (const project of projects) {
        ProjectModel.set(this, project, "create-placeholder");
      }
      for (const issue of issues) {
        IssueModel.set(this, issue, "create-placeholder");
      }
      for (const relation of relations) {
        RelationModel.set(this, relation, "create-placeholder");
      }
    } catch (e) {
      this.projects.clear();
      this.issues.clear();
      this.relations.clear();
      throw e;
    } finally {
      this.trackingChanges = true;
    }
  }
}

abstract class BaseModel {
  abstract id: string;
  abstract store: Store;
  abstract name: ModelName;
}

const IssuePropsRefdSchema = IssueSchema.shape.props.omit({ projectId: true }).extend({
  project: z.custom<ProjectModel | null>(),
});

type IssuePropsRefd = z.infer<typeof IssuePropsRefdSchema>;

class IssueModel implements BaseModel {
  readonly name = "issue";
  store: Store;
  id: string;
  /**
   * Why like this?
   *
   * The _internal is used for anything that is not part of the public interface.
   * These things *are* accessible, but should not be used outside the model.
   *
   * We could make them private, and then expose interfaces to the store to access
   * them as needed, but that's more work than I want right now.
   *
   * We could also just prefix props, relations, and placeholder with an underscore,
   * but I think this is more clear.
   *
   * The proxy around props isn't needed either. Like we could have helper functions
   * for updating them. But I like the readability you get when our other functions
   * just read/write the props directly.
   */
  _internal: {
    props: IssuePropsRefd;
    relations: Set<RelationModel>;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: IssuePropsRefd; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: { ...state },
      relations: new Set(),
      placeholder,
    };
    makeAutoObservable(this._internal);
    // Reaction to track when the project changes
    reaction(
      () => this._internal.props.project,
      (project, oldProject) => {
        if (oldProject) {
          oldProject._internal.issues.delete(this);
        }
        if (project) {
          project._internal.issues.add(this);
        }
      }
    );
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  get project() {
    return this._internal.props.project;
  }

  set project(project: ProjectModel | null) {
    this.update({ project });
  }

  get relations() {
    return this._internal.relations.values();
  }

  get createdAt() {
    return this._internal.props.createdAt;
  }

  static create(store: Store, id: string, props: IssuePropsRefd) {
    if (store.issues.has(id)) {
      throw new Error(`Issue with id ${id} already exists`);
    }
    const issue = new IssueModel(store, id, { state: props });
    store.issues.set(id, issue);
    store.addChange({
      operation: "create",
      model: "issue",
      id,
      props: IssueModel.serializeProps(props),
    });
    return issue;
  }

  static createPlaceholder(store: Store, id: string) {
    if (store.issues.has(id)) {
      throw new Error(`Issue with id ${id} already exists`);
    }
    const now = Date.now();
    const issue = new IssueModel(store, id, {
      state: {
        title: "",
        project: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      placeholder: true,
    });
    store.issues.set(id, issue);
    return issue;
  }

  static getOrCreatePlaceholder(store: Store, id: string, props?: IssuePropsRefd) {
    return store.issues.get(id) ?? props === undefined
      ? IssueModel.createPlaceholder(store, id)
      : IssueModel.create(store, id, props);
  }

  static getOrThrow(store: Store, id: string) {
    const issue = store.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    return issue;
  }

  update(props: Partial<IssuePropsRefd>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof IssuePropsRefd];
      }
    }
    Object.assign(this._internal.props, props);
    this.store.addChange({
      operation: "update",
      model: "issue",
      id: this.id,
      oldProps: IssueModel.serializePartialProps(oldProps),
      newProps: IssueModel.serializePartialProps(props),
    });
  }

  delete() {
    this.store.addChange({
      operation: "delete",
      model: "issue",
      id: this.id,
      props: IssueModel.serializeProps(this._internal.props),
    });
    this.store.issues.delete(this.id);
  }

  static #serializePartialProps(props: Partial<IssuePropsRefd>): Partial<IssueProps> {
    const serialized = {} as Partial<IssueProps>;
    for (const key in props) {
      const typedKey = key as keyof IssuePropsRefd;
      if (props[typedKey] === undefined) continue;
      switch (typedKey) {
        case "title":
          serialized.title = props.title;
          break;
        case "createdAt":
          serialized.createdAt = props.createdAt;
          break;
        case "updatedAt":
          serialized.updatedAt = props.updatedAt;
          break;
        case "deletedAt":
          serialized.deletedAt = props.deletedAt;
          break;
        case "project":
          serialized.projectId = props.project?.id ?? null;
          break;
        default:
          typedKey satisfies never;
      }
    }
    return serialized;
  }

  static serializePartialProps(props: Partial<IssuePropsRefd>): Partial<IssueProps> {
    return IssueModel.#serializePartialProps(props);
  }

  static serializeProps(props: IssuePropsRefd): IssueProps {
    return IssueSchema.shape.props.parse(IssueModel.#serializePartialProps(props));
  }

  static #deserializePartialProps(
    store: Store,
    props: Partial<IssueProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<IssuePropsRefd> {
    const deserialized: Partial<IssuePropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof IssueProps;
      if (props[typedKey] === undefined) continue;
      switch (typedKey) {
        case "projectId":
          if (props.projectId) {
            deserialized.project =
              onMissing === "create-placeholder"
                ? ProjectModel.getOrCreatePlaceholder(store, props.projectId)
                : ProjectModel.getOrThrow(store, props.projectId);
          } else {
            deserialized.project = null;
          }
          break;
        case "createdAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "updatedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "deletedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "title":
          deserialized[typedKey] = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  static deserializePartialProps(
    store: Store,
    props: Partial<IssueProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<IssuePropsRefd> {
    return IssueModel.#deserializePartialProps(store, props, onMissing);
  }

  static deserializeProps(
    store: Store,
    props: IssueProps,
    onMissing: "create-placeholder" | "error" = "error"
  ): IssuePropsRefd {
    return IssuePropsRefdSchema.parse(IssueModel.#deserializePartialProps(store, props, onMissing));
  }

  static set(store: Store, data: IssueData, onMissing: "create-placeholder" | "error" = "error") {
    const props = IssueModel.deserializeProps(store, data.props, onMissing);
    let issue = store.issues.get(data.id);
    if (issue) {
      issue.update(props);
      issue._internal.placeholder = false;
    } else {
      issue = new IssueModel(store, data.id, { state: props });
      store.issues.set(data.id, issue);
    }
    return issue;
  }
}

const ProjectPropsRefdSchema = ProjectSchema.shape.props;

type ProjectPropsRefd = z.infer<typeof ProjectPropsRefdSchema>;

class ProjectModel implements BaseModel {
  readonly name = "project";
  store: Store;
  id: string;
  _internal: {
    props: ProjectPropsRefd;
    issues: Set<IssueModel>;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: ProjectPropsRefd; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: { ...state },
      issues: new Set<IssueModel>(),
      placeholder,
    };
    makeAutoObservable(this._internal);
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  get issues() {
    return this._internal.issues.values();
  }

  get createdAt() {
    return this._internal.props.createdAt;
  }

  get title() {
    return this._internal.props.title;
  }

  set title(title: string) {
    this.update({ title });
  }

  removeIssue(issue: IssueModel) {
    issue.project = null;
  }

  addIssue(issue: IssueModel) {
    issue.project = this;
  }

  static create(store: Store, id: string, props: ProjectPropsRefd) {
    if (store.projects.has(id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    const project = new ProjectModel(store, id, { state: props });
    store.projects.set(id, project);
    store.addChange({
      operation: "create",
      model: "project",
      id,
      props: ProjectModel.serializeProps(props),
    });
    return project;
  }

  static createPlaceholder(store: Store, id: string) {
    if (store.projects.has(id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    const now = Date.now();
    const project = new ProjectModel(store, id, {
      state: {
        title: "",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      placeholder: true,
    });
    store.projects.set(id, project);
    return project;
  }

  static getOrCreatePlaceholder(store: Store, id: string, props?: ProjectPropsRefd) {
    return (
      store.projects.get(id) ??
      (props === undefined
        ? ProjectModel.createPlaceholder(store, id)
        : ProjectModel.create(store, id, props))
    );
  }

  static getOrThrow(store: Store, id: string) {
    const project = store.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} does not exist`);
    }
    return project;
  }

  update(props: Partial<ProjectPropsRefd>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof ProjectPropsRefd];
      }
    }
    Object.assign(this._internal.props, props);
    this.store.addChange({
      operation: "update",
      model: "project",
      id: this.id,
      oldProps: ProjectModel.serializePartialProps(oldProps),
      newProps: ProjectModel.serializePartialProps(props),
    });
  }

  delete() {
    this.store.projects.delete(this.id);
    this.store.addChange({
      operation: "delete",
      model: "project",
      id: this.id,
      props: ProjectModel.serializeProps(this._internal.props),
    });
  }

  static #serializePartialProps(props: Partial<ProjectPropsRefd>): Partial<ProjectProps> {
    return props;
  }

  static serializePartialProps(props: Partial<ProjectPropsRefd>): Partial<ProjectProps> {
    return ProjectModel.#serializePartialProps(props);
  }

  static serializeProps(props: ProjectPropsRefd): ProjectProps {
    return ProjectSchema.shape.props.parse(ProjectModel.#serializePartialProps(props));
  }

  static #deserializePartialProps(
    store: Store,
    props: Partial<ProjectProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<ProjectPropsRefd> {
    return props;
  }

  static deserializePartialProps(
    store: Store,
    props: Partial<ProjectProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<ProjectPropsRefd> {
    return ProjectModel.#deserializePartialProps(store, props, onMissing);
  }

  static deserializeProps(
    store: Store,
    props: ProjectProps,
    onMissing: "create-placeholder" | "error" = "error"
  ): ProjectPropsRefd {
    return ProjectPropsRefdSchema.parse(
      ProjectModel.#deserializePartialProps(store, props, onMissing)
    );
  }

  static set(store: Store, data: ProjectData, onMissing: "create-placeholder" | "error" = "error") {
    const props = ProjectModel.deserializeProps(store, data.props, onMissing);
    let project = store.projects.get(data.id);
    if (project) {
      project.update(props);
      project._internal.placeholder = false;
    } else {
      project = ProjectModel.create(store, data.id, props);
    }
    return project;
  }
}

const RelationPropsRefdSchema = RelationSchema.shape.props
  .omit({ fromId: true, toId: true })
  .extend({
    from: z.custom<IssueModel>(),
    to: z.custom<IssueModel>(),
  });

type RelationPropsRefd = z.infer<typeof RelationPropsRefdSchema>;

class RelationModel implements BaseModel {
  readonly name = "relation";
  store: Store;
  id: string;
  _internal: {
    props: RelationPropsRefd;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: RelationPropsRefd; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: state,
      placeholder,
    };
    makeAutoObservable(this._internal);
    reaction(
      () => this._internal.props.from,
      (from, oldFrom) => {
        if (oldFrom) {
          oldFrom._internal.relations.delete(this);
        }
        if (from) {
          from._internal.relations.add(this);
        }
      },
      { fireImmediately: true }
    );
    reaction(
      () => this._internal.props.to,
      (to, oldTo) => {
        if (oldTo) {
          oldTo._internal.relations.delete(this);
        }
        if (to) {
          to._internal.relations.add(this);
        }
      },
      { fireImmediately: true }
    );
  }

  get placeholder(): boolean {
    return this._internal.placeholder;
  }

  get createdAt() {
    return this._internal.props.createdAt;
  }

  update(props: Partial<RelationPropsRefd>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof RelationPropsRefd];
      }
    }
    Object.assign(this._internal.props, props);
    this.store.addChange({
      operation: "update",
      model: "relation",
      id: this.id,
      oldProps: RelationModel.serializePartialProps(oldProps),
      newProps: RelationModel.serializePartialProps(props),
    });
  }

  delete() {
    this.store.relations.delete(this.id);
    this.store.addChange({
      operation: "delete",
      model: "relation",
      id: this.id,
      props: RelationModel.serializeProps(this._internal.props),
    });
  }

  static create(store: Store, id: string, props: RelationPropsRefd) {
    if (store.relations.has(id)) {
      throw new Error(`Relation with id ${id} already exists`);
    }
    const relation = new RelationModel(store, id, { state: props });
    store.relations.set(id, relation);
    store.addChange({
      operation: "create",
      model: "relation",
      id,
      props: RelationModel.serializeProps(props),
    });
    return relation;
  }

  static createPlaceholder(store: Store, id: string, from: IssueModel, to: IssueModel) {
    if (store.relations.has(id)) {
      throw new Error(`Relation with id ${id} already exists`);
    }
    const now = Date.now();
    const relation = new RelationModel(store, id, {
      state: { createdAt: now, updatedAt: now, deletedAt: null, from, to },
      placeholder: true,
    });
    store.relations.set(id, relation);
    return relation;
  }

  static getOrCreatePlaceholder(store: Store, id: string, props?: RelationPropsRefd) {
    return (
      store.relations.get(id) ??
      (props === undefined
        ? RelationModel.createPlaceholder(store, id, props!.from, props!.to)
        : RelationModel.create(store, id, props))
    );
  }

  static getOrThrow(store: Store, id: string) {
    const relation = store.relations.get(id);
    if (!relation) {
      throw new Error(`Relation with id ${id} does not exist`);
    }
    return relation;
  }

  static #serializePartialProps(props: Partial<RelationPropsRefd>) {
    const serialized = {} as Partial<RelationProps>;
    for (const key in props) {
      const typedKey = key as keyof RelationPropsRefd;
      if (!props[typedKey]) continue;
      switch (typedKey) {
        case "from":
          serialized.fromId = props[typedKey].id;
          break;
        case "to":
          serialized.toId = props[typedKey].id;
          break;
        case "createdAt":
          serialized.createdAt = props[typedKey];
          break;
        case "updatedAt":
          serialized.updatedAt = props[typedKey];
          break;
        case "deletedAt":
          serialized.deletedAt = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return serialized;
  }

  static serializePartialProps(props: Partial<RelationPropsRefd>): Partial<RelationProps> {
    return RelationModel.#serializePartialProps(props);
  }

  static serializeProps(props: RelationPropsRefd): RelationProps {
    return RelationPropsSchema.parse(RelationModel.#serializePartialProps(props));
  }

  static #deserializePartialProps(
    store: Store,
    props: Partial<RelationProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<RelationPropsRefd> {
    const deserialized: Partial<RelationPropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof RelationProps;
      if (!props[typedKey]) continue;
      switch (typedKey) {
        case "fromId":
          deserialized.from =
            onMissing === "create-placeholder"
              ? IssueModel.getOrCreatePlaceholder(store, props[typedKey])
              : IssueModel.getOrThrow(store, props[typedKey]);
          break;
        case "toId":
          deserialized.to =
            onMissing === "create-placeholder"
              ? IssueModel.getOrCreatePlaceholder(store, props[typedKey])
              : IssueModel.getOrThrow(store, props[typedKey]);
          break;
        case "createdAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "updatedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "deletedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  static deserializePartialProps(
    store: Store,
    props: Partial<RelationProps>,
    onMissing: "create-placeholder" | "error" = "error"
  ): Partial<RelationPropsRefd> {
    return RelationModel.#deserializePartialProps(store, props, onMissing);
  }

  static deserializeProps(
    store: Store,
    props: RelationProps,
    onMissing: "create-placeholder" | "error" = "error"
  ): RelationPropsRefd {
    return RelationPropsRefdSchema.parse(
      RelationModel.#deserializePartialProps(store, props, onMissing)
    );
  }

  static set(
    store: Store,
    data: RelationData,
    onMissing: "create-placeholder" | "error" = "error"
  ) {
    const props = RelationModel.deserializeProps(store, data.props, onMissing);
    let relation = store.relations.get(data.id);
    if (relation) {
      relation.update(props);
      relation._internal.placeholder = false;
    } else {
      relation = RelationModel.create(store, data.id, props);
    }
    return relation;
  }
}

function createProjectProps(props: Partial<ProjectProps>): ProjectProps {
  return { createdAt: Date.now(), updatedAt: Date.now(), title: "", deletedAt: null, ...props };
}

function createIssueProps(props: Partial<IssueProps>): IssueProps {
  return {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: "",
    deletedAt: null,
    projectId: null,
    ...props,
  };
}

function createRelationProps(
  props: Partial<RelationProps> & { fromId: string; toId: string }
): RelationProps {
  return { createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null, ...props };
}

function test() {
  const store = new Store();
  const project1 = ProjectModel.set(store, {
    id: "1",
    model: "project",
    props: createProjectProps({ title: "Project 1" }),
  });
  const project2 = ProjectModel.set(store, {
    id: "2",
    model: "project",
    props: createProjectProps({ title: "Project 2" }),
  });
  const issue1 = IssueModel.set(store, {
    id: "1",
    model: "issue",
    props: createIssueProps({ title: "Issue 1", projectId: "1" }),
  });
  const issue2 = IssueModel.set(store, {
    id: "2",
    model: "issue",
    props: createIssueProps({ title: "Issue 2", projectId: "2" }),
  });
  //   const issue3 = IssueModel.set(store, {
  //     id: "3",
  //     model: "issue",
  //     props: createIssueProps({ title: "Issue 3", projectId: "2" }),
  //   });
  //   const relation1 = RelationModel.set(store, {
  //     id: "1",
  //     model: "relation",
  //     props: createRelationProps({ fromId: "1", toId: "2" }),
  //   });

  autorun(() => {
    console.log("issue1.project", toJS(issue1.project));
  });

  autorun(() => {
    console.log("issue2.project", toJS(issue2.project));
  });

  runInAction(() => {
    issue1.project = project2;
    issue2.project = project2;
    project1.title = "Project 1 (updated)";
    project2.removeIssue(issue1);
  });

  //   runInAction(() => {
  //     ProjectModel.create(store, "3", { title: "Project 3", placeholder: false });
  //   });

  //   runInAction(() => {
  //     relation1.update({ to: issue3 });
  //     RelationModel.create(store, "2", { from: issue1, to: issue3 });
  //   });
}

test();

import { generateKeyBetween } from "fractional-indexing";
import { makeAutoObservable, reaction, runInAction } from "mobx";
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
} from "./types";
import { z } from "zod";

/**
 * TODOs
 * - DONE Define the serialized state schemas for each model.
 * - DONE Derive the serialized events from the serialized state schemas.
 * - Methods for serializing and deserializing props and tracking changes.
 *   For now, don't get fancy with these. Just do it right on the models.
 *   The models are then responsible for knowing how to map b/w ids and models
 *   (e.g. which foreign key maps to which model?)
 */

function reverseEvent<K extends ModelName>(event: Event<K>): Event<K> {
  switch (event.operation) {
    case "create":
      return { operation: "delete", model: event.model, id: event.id, props: event.props };
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

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  relations: Map<string, RelationModel> = new Map();
  views: Map<string, ViewModel> = new Map();
  trackingChanges: boolean = true;

  undoStack: Event<ModelName>[][] = [];
  redoStack: Event<ModelName>[][] = [];

  uncommittedChanges: Event<ModelName>[] = [];
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

  addChange<K extends ModelName>(change: Event<K>) {
    if (this.trackingChanges) {
      this.changeCount++;
      this.uncommittedChanges.push(change);
    }
  }

  /**
   * @throws if a referenced model does not exist
   */
  applyChange<K extends ModelName>(change: Event<K>) {
    switch (change.operation) {
      case "create":
        switch (change.model) {
          case "project":
            this.createProject(change.id, change.props);
            break;
          case "issue":
            this.createIssue(change.id, change.props);
            break;
          case "relation":
            this.createRelation(change.id, change.props);
            break;
        }
        break;
      case "update":
        switch (change.model) {
          case "project": {
            const project = this.projects.get(change.id);
            if (!project) {
              throw new Error(`Project with id ${change.id} does not exist`);
            }
            project.updateProps(change.newProps);
            break;
          }
          case "issue": {
            const issue = this.issues.get(change.id);
            if (!issue) {
              throw new Error(`Issue with id ${change.id} does not exist`);
            }
            issue.updateProps(change.newProps);
            break;
          }
          case "relation": {
            const relation = this.relations.get(change.id);
            if (!relation) {
              throw new Error(`Relation with id ${change.id} does not exist`);
            }
            relation.updateProps(change.newProps);
            break;
          }
        }
        break;
      case "delete":
        switch (change.model) {
          case "project":
            this.deleteProject(change.id);
            break;
          case "issue":
            this.deleteIssue(change.id);
            break;
          case "relation":
            this.deleteRelation(change.id);
            break;
        }
        break;
      case "set":
        switch (change.model) {
          case "project": {
            if (change.newProps === null) {
              this.deleteProject(change.id);
            } else {
              const project = this.projects.get(change.id);
              if (!project) {
                this.createProject(change.id, change.newProps);
              } else {
                project.updateProps(project.deserializeProps(change.newProps));
              }
            }
            break;
          }
          case "issue": {
            if (change.newProps === null) {
              this.deleteIssue(change.id);
            } else {
              const issue = this.issues.get(change.id);
              if (!issue) {
                this.createIssue(change.id, change.newProps);
              } else {
                issue.updateProps(issue.deserializeProps(change.newProps));
              }
            }
            break;
          }
          case "relation": {
            if (change.newProps === null) {
              this.deleteRelation(change.id);
            } else {
              const relation = this.relations.get(change.id);
              if (!relation) {
                this.createRelation(change.id, change.newProps);
              } else {
                relation.updateProps(relation.deserializeProps(change.newProps));
              }
            }
            break;
          }
        }
        break;
      default:
        change satisfies never;
    }
  }

  private loadProject(data: ProjectData) {
    this.trackingChanges = false;
    let project = this.projects.get(data.id);
    if (project) {
      project.populatePlaceholder(project.deserializeProps(data.props));
    } else {
      project = new ProjectModel(this, data.id, { state: data.props });
      this.projects.set(data.id, project);
    }
    this.trackingChanges = true;
    return project;
  }

  private loadIssue(data: IssueData) {
    this.trackingChanges = false;
    const project = data.props.projectId ? this.getOrCreateProject(data.props.projectId) : null;
    const props = { ...data.props, project };
    let issue = this.issues.get(data.id);
    if (issue) {
      issue.populatePlaceholder(props);
    } else {
      issue = new IssueModel(this, data.id, { state: props });
      this.issues.set(data.id, issue);
    }
    this.trackingChanges = true;
    return issue;
  }

  private loadRelation(data: RelationData) {
    this.trackingChanges = false;
    let relation = this.relations.get(data.id);
    if (relation) {
      relation.populatePlaceholder(relation.deserializeProps(data.props));
    } else {
      relation = new RelationModel(this, data.id, {
        state: {
          ...data.props,
          from: this.getOrCreateIssue(data.props.fromId),
          to: this.getOrCreateIssue(data.props.toId),
        },
      });
      this.relations.set(data.id, relation);
    }
    this.trackingChanges = true;
    return relation;
  }

  private loadView(data: ViewData) {
    this.trackingChanges = false;
    const project = data.projectId ? this.getOrCreateProject(data.projectId) : null;
    const view = this.getOrCreateView(data.id, { project });
    this.trackingChanges = true;
    return view;
  }

  private loadViewIssuePosition(data: ViewIssuePositionData) {
    this.trackingChanges = false;
    const model = this.getOrCreateView(data.viewId);
    const issue = this.getOrCreateIssue(data.issueId);
    model.setIssuePosition(issue, data.position);
    this.trackingChanges = true;
  }

  load({
    projects = [],
    issues = [],
    relations = [],
    views = [],
    viewIssuePositions = [],
  }: {
    projects?: ProjectData[];
    issues?: IssueData[];
    relations?: RelationData[];
    views?: ViewData[];
    viewIssuePositions?: ViewIssuePositionData[];
  }) {
    this.trackingChanges = false;
    try {
      for (const project of projects) {
        this.loadProject(project);
      }
      for (const issue of issues) {
        this.loadIssue(issue);
      }
      for (const relation of relations) {
        this.loadRelation(relation);
      }
      for (const view of views) {
        this.loadView(view);
      }
      for (const viewIssuePosition of viewIssuePositions) {
        this.loadViewIssuePosition(viewIssuePosition);
      }
    } catch (e) {
      this.projects.clear();
      this.issues.clear();
      this.relations.clear();
      this.views.clear();
      throw e;
    } finally {
      this.trackingChanges = true;
    }
  }

  private getOrCreateIssue(id: string, props?: Partial<IssuePropsRefd>) {
    let issue = this.issues.get(id);
    if (issue) {
      return issue;
    } else if (props) {
      issue = new IssueModel(this, id, { state: props });
      this.issues.set(id, issue);
      return issue;
    } else {
      issue = IssueModel.createPlaceholder(this, id);
      this.issues.set(id, issue);
      return issue;
    }
  }

  private getOrCreateView(id: string, props?: Partial<ViewState>) {
    let model = this.views.get(id);
    if (model) {
      return model;
    } else {
      model = props ? new ViewModel(this, id, props) : ViewModel.createPlaceholder(this, id);
      this.views.set(id, model);
      return model;
    }
  }

  private getOrCreateProject(id: string, props?: Partial<ProjectPropsRefd>) {
    let project = this.projects.get(id);
    if (project) {
      return project;
    } else {
      project = props
        ? new ProjectModel(this, id, { state: props })
        : ProjectModel.createPlaceholder(this, id);
      this.projects.set(id, project);
      return project;
    }
  }

  private getOrCreateRelation(id: string, props?: Partial<RelationPropsRefd>) {
    let relation = this.relations.get(id);
    if (relation) {
      return relation;
    } else {
      relation = props
        ? new RelationModel(this, id, { state: props })
        : RelationModel.createPlaceholder(this, id);
      this.relations.set(id, relation);
      return relation;
    }
  }

  createIssue(id: string, props: IssuePropsRefd) {
    if (this.issues.has(id)) {
      throw new Error(`Issue with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const issue = new IssueModel(this, id, { state: props });
    this.trackingChanges = true;
    this.issues.set(id, issue);
    this.addChange({
      operation: "create",
      model: "issue",
      id,
      props: issue.serializeProps(props),
    });
    return issue;
  }

  createProject(id: string, props: Partial<ProjectPropsRefd>) {
    if (this.projects.has(id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const project = new ProjectModel(this, id, { state: props });
    this.trackingChanges = true;
    this.projects.set(id, project);
    this.addChange({
      operation: "create",
      model: "project",
      id,
      props: this.serializeProps(props),
    });
    return project;
  }

  createRelation(id: string, props: Partial<RelationPropsRefd>) {
    if (this.relations.has(id)) {
      throw new Error(`Relation with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const relation = new RelationModel(this, id, { state: props });
    this.trackingChanges = true;
    this.relations.set(id, relation);
    this.addChange({
      operation: "create",
      model: "relation",
      id,
      props: this.serializeProps(props),
    });
    return relation;
  }

  deleteIssue(id: string) {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "issue",
      id,
      oldProps: this.serializeProps(issue._state),
    });
    this.issues.delete(id);
  }

  deleteProject(id: string) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "project",
      id,
      oldProps: this.serializeProps(project._state),
    });
    this.projects.delete(id);
  }

  deleteRelation(id: string) {
    const relation = this.relations.get(id);
    if (!relation) {
      throw new Error(`Relation with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "relation",
      id,
      oldProps: this.serializeProps(relation._state),
    });
    this.relations.delete(id);
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
    { state, placeholder = false }: { state: Partial<IssuePropsRefd>; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: {
        title: "",
        project: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...state,
      },
      relations: new Set(),
      placeholder,
    };
    moveIssueToProject(this, this._internal.props.project);
  }

  serializeProps(props: Partial<IssuePropsRefd>): Partial<IssueProps> {
    const serialized = {} as Partial<IssueProps>;
    for (const key in props) {
      const typedKey = key as keyof IssuePropsRefd;
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
        case "project":
          serialized.projectId = props.project?.id ?? null;
          break;
        default:
          typedKey satisfies never;
      }
    }
    return serialized;
  }

  /**
   * @throws if a referenced model does not exist
   */
  deserializeProps(props: Partial<IssueProps>) {
    const deserialized: Partial<IssuePropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof IssueProps;
      switch (typedKey) {
        case "title":
          deserialized.title = props.title;
          break;
        case "createdAt":
          deserialized.createdAt = props.createdAt;
          break;
        case "updatedAt":
          deserialized.updatedAt = props.updatedAt;
          break;
        case "projectId": {
          const project = props.projectId ? this.store.projects.get(props.projectId) : null;
          if (project === undefined) {
            throw new Error(`Project with id ${props.projectId} does not exist`);
          }
          deserialized.project = project;
          break;
        }
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  updateProps(props: Partial<IssuePropsRefd>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof IssuePropsRefd];
      }
    }
    this.store.addChange({
      operation: "update",
      model: "issue",
      id: this.id,
      oldProps: IssuePropsRefdSchema.parse(oldProps),
      newProps: IssuePropsRefdSchema.parse(props),
    });
    Object.assign(this._internal.props, props);
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  get project() {
    return this._internal.props.project;
  }

  set project(project: ProjectModel | null) {
    moveIssueToProject(this, project);
  }

  get relations() {
    return this._internal.relations.values();
  }

  get createdAt() {
    return this._internal.props.createdAt;
  }

  static createPlaceholder(store: Store, id: string) {
    return new IssueModel(store, id, { state: { project: null }, placeholder: true });
  }

  populatePlaceholder(props: Partial<IssuePropsRefd>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder issue");
    }
    this.updateProps(props);
    this._internal.placeholder = false;
  }
}

function moveIssueToProject(issue: IssueModel, project: ProjectModel | null) {
  if (issue.project) {
    issue.project._internal.issues.delete(issue);
  }
  issue._internal.props.project = project;
  if (project) {
    project._internal.issues.add(issue);
  }
}

function updateRelationIssues(
  relation: RelationModel,
  { from, to }: { from?: IssueModel; to?: IssueModel }
) {
  if (from !== undefined) {
    const oldFrom = relation._internal.props.from;
    oldFrom._internal.relations.delete(relation);
    relation._internal.props.from = from;
    from._internal.relations.add(relation);
  }
  if (to !== undefined) {
    const oldTo = relation._internal.props.to;
    oldTo._internal.relations.delete(relation);
    relation._internal.props.to = to;
    to._internal.relations.add(relation);
  }
}

const ProjectPropsRefdSchema = ProjectSchema.shape.props;

type ProjectPropsRefd = z.infer<typeof ProjectPropsRefdSchema>;

class ProjectModel implements BaseModel {
  readonly name = "project";
  store: Store;
  id: string;
  _internal: {
    props: ProjectProps;
    issues: Set<IssueModel>;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: Partial<ProjectProps>; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: {
        title: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        ...state,
      },
      issues: new Set<IssueModel>(),
      placeholder,
    };
  }

  serializeProps(props: Partial<ProjectPropsRefd>): Partial<ProjectProps> {
    return props;
  }

  deserializeProps(props: Partial<ProjectProps>): Partial<ProjectPropsRefd> {
    return props;
  }

  updateProps(props: Partial<ProjectProps>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof ProjectProps];
      }
    }
    this.store.addChange({
      operation: "update",
      model: "project",
      id: this.id,
      oldProps: ProjectPropsRefdSchema.parse(oldProps),
      newProps: ProjectPropsRefdSchema.parse(props),
    });
    Object.assign(this._internal.props, props);
  }

  get title() {
    return this._internal.props.title;
  }

  set title(value: string) {
    this.updateProps({ title: value });
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  set placeholder(value: boolean) {
    this._internal.placeholder = value;
  }

  static createPlaceholder(store: Store, id: string) {
    return new ProjectModel(store, id, { state: {}, placeholder: true });
  }

  populatePlaceholder(props: Partial<ProjectPropsRefd>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder project");
    }
    this.updateProps(props);
    this._internal.placeholder = false;
  }

  getIssues(): IterableIterator<IssueModel> {
    return this._internal.issues.values();
  }

  addIssue(issue: IssueModel) {
    moveIssueToProject(issue, this);
  }

  removeIssue(issue: IssueModel) {
    moveIssueToProject(issue, null);
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
      props: { ...state },
      placeholder,
    };
    updateRelationIssues(this, { from, to });
  }

  serializeProps(props: Partial<RelationPropsRefd>): Partial<RelationProps> {
    const serialized: Partial<RelationProps> = {};
    for (const key in props) {
      const typedKey = key as keyof RelationPropsRefd;
      if (props[typedKey] === undefined) continue;
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

  deserializeProps(props: Partial<RelationProps>): Partial<RelationPropsRefd> {
    const deserialized: Partial<RelationPropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof RelationProps;
      if (props[typedKey] === undefined) continue;
      switch (typedKey) {
        case "fromId": {
          const issue = this.store.issues.get(props[typedKey]);
          if (issue === undefined) {
            throw new Error(`Issue with id ${props[typedKey]} does not exist`);
          }
          deserialized.from = issue;
          break;
        }
        case "toId": {
          const issue = this.store.issues.get(props[typedKey]);
          if (issue === undefined) {
            throw new Error(`Issue with id ${props[typedKey]} does not exist`);
          }
          deserialized.to = issue;
          break;
        }
        case "createdAt":
          deserialized.createdAt = props[typedKey];
          break;
        case "updatedAt":
          deserialized.updatedAt = props[typedKey];
          break;
        case "deletedAt":
          deserialized.deletedAt = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  updateProps(props: Partial<RelationPropsRefd>) {
    const oldProps = {} as any;
    for (const key in props) {
      if (key in this._internal.props) {
        oldProps[key] = this._internal.props[key as keyof RelationPropsRefd];
      }
    }
    this.store.addChange({
      operation: "update",
      model: "relation",
      id: this.id,
      oldProps: RelationPropsRefdSchema.parse(oldProps),
      newProps: RelationPropsRefdSchema.parse(props),
    });
    Object.assign(this._internal.props, props);
    updateRelationIssues(this, props);
  }

  get from(): IssueModel {
    return this._internal.props.from;
  }

  set from(issue: IssueModel) {
    this.updateProps({ from: issue });
  }

  get to(): IssueModel {
    return this._internal.props.to;
  }

  set to(issue: IssueModel) {
    this.updateProps({ to: issue });
  }

  get placeholder(): boolean {
    return this._internal.placeholder;
  }

  static createPlaceholder(
    store: Store,
    id: string,
    from: IssueModel,
    to: IssueModel
  ): RelationModel {
    const now = Date.now();
    return new RelationModel(store, id, {
      state: {
        from,
        to,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      placeholder: true,
    });
  }

  populatePlaceholder(data: RelationPropsRefd) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder relation");
    }
    this.updateProps(data);
    this._internal.placeholder = false;
  }
}

type ViewData = {
  id: string;
  projectId: string | null;
  issueIdToPosition: Record<string, string>;
};

type ViewState = {
  project: ProjectModel | null; // later this'll be a query
  // The project defines the set of issues (and later the query). This
  // just assigns positions to issues.
};

type ViewIssuePositionData = {
  viewId: string;
  issueId: string;
  position: Position;
};

type Position = string;

function generatePositionBetween(a: Position | null, b: Position | null): Position {
  if (a === null && b === null) {
    return Date.now().toString() + "-" + generateKeyBetween(null, null);
  } else if (a && b) {
    const aParts = a.split("-");
    const bParts = b.split("-");
    if (aParts[0] === bParts[0]) {
      return aParts[0] + "-" + generateKeyBetween(aParts[1], bParts[1]);
    } else {
      return aParts[0] + "-" + generateKeyBetween(aParts[1], null);
    }
  } else if (b && a === null) {
    const datePart = b.split("-")[0];
    return datePart + "-" + generateKeyBetween(null, b);
  } else if (a && b === null) {
    const datePart = a.split("-")[0];
    return datePart + "-" + generateKeyBetween(a, null);
  } else {
    // TODO why can't do this in typescript?
    throw new Error("Invalid arguments to generatePosition");
  }
}

function generatePosition(issue: IssueModel): Position {
  return issue.createdAt.toString() + "-" + generateKeyBetween(null, null);
}

function sortPosition(a: Position, b: Position) {
  return a.localeCompare(b);
}

class ViewModel implements BaseModel {
  readonly name = "view";
  store: Store;
  id: string;
  _state: ViewState;
  issueIdToPosition: Record<string, Position> = {};
  placeholder: boolean;

  constructor(
    store: Store,
    id: string,
    { project = null, placeholder = false }: Partial<ViewState> & { placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._state = makeTracking({ project }, this);
    this.placeholder = placeholder;
  }

  setIssuePosition(issue: IssueModel, position: Position) {
    this.store.addChange({
      operation: "set",
      model: "view-issue-position",
      id: this.id + "-" + issue.id,
      oldProps: { viewId: this.id, issueId: issue.id, position: this.issueIdToPosition[issue.id] },
      newProps: { viewId: this.id, issueId: issue.id, position },
    });
    this.issueIdToPosition[issue.id] = position;
  }

  removeIssuePosition(issue: IssueModel) {
    this.store.addChange({
      operation: "delete",
      model: "view-issue-position",
      id: this.id + "-" + issue.id,
      oldProps: { viewId: this.id, issueId: issue.id, position: this.issueIdToPosition[issue.id] },
    });
    delete this.issueIdToPosition[issue.id];
  }

  getPositionedIssues() {
    return Array.from(this._state.project?.getIssues() ?? []).map((issue) => ({
      issue,
      position: this.issueIdToPosition[issue.id] ?? generatePosition(issue),
    }));
  }

  moveIssueAfter(issue: IssueModel, before: IssueModel) {
    const sortedIssues = this.getPositionedIssues().sort((a, b) =>
      sortPosition(a.position, b.position)
    );
    if (
      !sortedIssues.some((v) => v.issue === before) ||
      !sortedIssues.some((v) => v.issue === issue)
    ) {
      throw new Error("Issue not found in view");
    }

    const indexBefore = sortedIssues.findIndex((v) => v.issue === before);
    const indexAfter = indexBefore + 1;
    const beforePositioned = sortedIssues[indexBefore];
    const afterPositioned = sortedIssues[indexAfter];

    this.setIssuePosition(
      issue,
      generatePositionBetween(afterPositioned.position, beforePositioned.position)
    );
    // If either of the issues before/after had ephemeral positions, update them now
    if (!this._state.issueIdToPosition[beforePositioned.issue.id]) {
      this.setIssuePosition(beforePositioned.issue, beforePositioned.position);
    }
    if (!this._state.issueIdToPosition[afterPositioned.issue.id]) {
      this.setIssuePosition(afterPositioned.issue, afterPositioned.position);
    }
  }

  static createPlaceholder(store: Store, id: string) {
    return new ViewModel(store, id, { project: null, placeholder: true });
  }

  populatePlaceholder(props: Partial<ViewState>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder view");
    }
    Object.assign(this._state, props);
    this.placeholder = false;
  }
}

function test() {
  const store = new Store();

  store.load({
    projects: [
      { id: "1", title: "Project 1" },
      { id: "2", title: "Project 2" },
    ],
    issues: [
      { id: "1", projectId: "1", title: "Issue 1", createdAt: 1 },
      { id: "2", projectId: "2", title: "Issue 2", createdAt: 2 },
      { id: "3", projectId: "2", title: "Issue 3", createdAt: 3 },
    ],
    relations: [{ id: "1", fromId: "1", toId: "2", type: "related-to" }],
    views: [{ id: "1", projectId: "1", issueIdToPosition: {} }],
    viewIssuePositions: [],
  });
  const issue1 = store.issues.get("1")!;
  const issue2 = store.issues.get("2")!;
  const issue3 = store.issues.get("3")!;
  const project1 = store.projects.get("1")!;
  const project2 = store.projects.get("2")!;
  const relation1 = store.relations.get("1")!;

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
    store.createRelation("2", { from: issue1, to: issue3 });
  });
}

test();

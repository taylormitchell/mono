import { generateKeyBetween } from "fractional-indexing";
import { get, makeAutoObservable, reaction, runInAction, set, toJS } from "mobx";
import { ModelData, ModelName, Event, IssueData, IssueSchema, UpdateEvent, IssueProps } from "./types";
import { string, z } from "zod";

/**
 * TODOs
 * - DONE Define the serialized state schemas for each model.
 * - DONE Derive the serialized events from the serialized state schemas.
 * - Methods for serializing and deserializing props and tracking changes.
 *   For now, don't get fancy with these. Just do it right on the models.
 *   The models are then responsible for knowing how to map b/w ids and models
 *   (e.g. which foreign key maps to which model?)
 */

function reverseEvent<T extends ModelData>(event: Event<T>): Event<T> {
  switch (event.operation) {
    case "create":
      return {
        operation: "delete",
        model: event.model,
        id: event.id,
        oldProps: event.props,
      };
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
        operation: "create",
        model: event.model,
        id: event.id,
        props: event.oldProps,
      };
    case "set":
      if (event.oldProps) {
        return {
          operation: "set",
          model: event.model,
          id: event.id,
          oldProps: event.newProps,
          newProps: event.oldProps,
        };
      } else {
        return {
          operation: "delete",
          model: event.model,
          id: event.id,
          oldProps: event.newProps,
        };
      }
  }
}

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  relations: Map<string, RelationModel> = new Map();
  views: Map<string, ViewModel> = new Map();
  trackingChanges: boolean = true;

  undoStack: Event[][] = [];
  redoStack: Event[][] = [];

  uncommittedChanges: Event<ModelData>[] = [];
  // Using an observable number to trigger a reaction b/c if we track the change array,
  // the reaction will need to modify it too (clear it) which you're not supposed to do
  // inside reactions.
  changeCount: number = 0;

  constructor() {
    makeAutoObservable(this, {
      uncommittedChanges: false,
    });
    reaction(
      () => this.changeCount,
      () => {
        console.log(toJS(this.uncommittedChanges.slice().map((v) => toJS(v))));
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
    }
  }

  addChange<T extends ModelData>(change: Event<T>) {
    if (this.trackingChanges) {
      this.changeCount++;
      this.uncommittedChanges.push(change);
    }
  }

  applyChange(change: Event) {
    switch (change.operation) {
      case "create":
        if (change.model === "project") {
          this.createProject(change.id, {
            title: change.props.title,
          });
        } else if (change.model === "issue") {
          this.createIssue(change.id, {
            project: this.getOrCreateProject(change.props.projectId),
            title: change.props.title,
            createdAt: change.props.createdAt,
          });
        } else if (change.model === "relation") {
          this.createRelation(change.id, {
            from: this.getOrCreateIssue(change.props.fromId),
            to: this.getOrCreateIssue(change.props.toId),
          });
        }
        break;
      case "update":
        if (change.model === "project") {
          const project = this.projects.get(change.id);
          if (!project) {
            throw new Error(`Project with id ${change.id} does not exist`);
          }
          project._state.title = change.newProps.title;
        } else if (change.model === "issue") {
          this.updateIssue(change.id, {
            title: change.newProps.title,
          });
        } else if (change.model === "relation") {
          this.updateRelation(change.id, {
            from: change.newProps.fromId,
            to: change.newProps.toId,
          });
        }
        break;
      case "delete":
        this.deleteModel(change);
        break;
      case "set":
        this.setModel(change);
        break;
    }
  }

  private loadProject(project: Project) {
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

  private loadIssue(issue: IssueData) {
    this.trackingChanges = false;
    const project = issue.projectId ? this.getOrCreateProject(issue.projectId) : null;
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

  private loadRelation(data: RelationData) {
    this.trackingChanges = false;
    let relation = this.relations.get(data.id);
    if (relation) {
      relation.populatePlaceholder(data);
    } else {
      relation = new RelationModel(this, data.id, {
        from: this.getOrCreateIssue(data.fromId),
        to: this.getOrCreateIssue(data.toId),
        placeholder: false,
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

  private getOrCreateIssue(id: string, props?: IssueState) {
    let issue = this.issues.get(id);
    if (issue) {
      return issue;
    } else if (props) {
      issue = new IssueModel(this, id, props);
      this.issues.set(id, issue);
      return issue;
    } else {
      issue = IssueModel.createPlaceholder(this, id);
      this.issues.set(id, issue);
      return issue;
    }
  }

  private getOrCreateView(id: string, props?: ViewState) {
    let model = this.views.get(id);
    if (model) {
      return model;
    } else {
      model = props ? new ViewModel(this, id, props) : ViewModel.createPlaceholder(this, id);
      this.views.set(id, model);
      return model;
    }
  }

  private getOrCreateProject(id: string, props?: ProjectState) {
    let project = this.projects.get(id);
    if (project) {
      return project;
    } else {
      project = props
        ? new ProjectModel(this, id, props)
        : ProjectModel.createPlaceholder(this, id);
      this.projects.set(id, project);
      return project;
    }
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

  deleteIssue(id: string) {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "issue",
      id,
      oldProps: serializeState(issue._state),
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
      oldProps: serializeState(project._state),
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
      oldProps: serializeState(relation._state),
    });
    this.relations.delete(id);
  }

  deserializeState<T extends ProjectData | IssueData | RelationData>(
    state: T
  ): T extends ProjectData
    ? ProjectState
    : T extends IssueData
    ? IssueState
    : T extends RelationData
    ? RelationState
    : never {
    const deserialized: Record<string, any> = {};
    for (const key in state) {
      const modelName = foreignKeys[key];
      if (modelName) {
        deserialized[key] = this.getOrCreateModel(modelName, state[key]);
      } else {
        deserialized[key] = state[key];
      }
    }
    return deserialized;
  }
}

abstract class BaseModel {
  abstract id: string;
  abstract store: Store;
  abstract name: ModelName;
}

type Model = IssueModel | ProjectModel | RelationModel | ViewModel;
function isModel(value: unknown): value is Model {
  return (
    value instanceof IssueModel ||
    value instanceof ProjectModel ||
    value instanceof RelationModel ||
    value instanceof ViewModel
  );
}

const IssuePropsRefdSchema = IssueSchema.shape.props.omit({ projectId: true }).extend({
    project: z.custom<ProjectModel | null>(),
})

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
        props: this.makePropProxy({
            title: "",
            project: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...state,
        }),
        relations: new Set(),
        placeholder,
    }
    moveIssueToProject(this, this._internal.props.project);
  }

  serializeProps(props: IssuePropsRefd) {
    return {
        title: props.title,
        projectId: props.project?.id ?? null,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
    } satisfies IssueProps;
    }

  deserializeProps(props: IssueProps) {
    return {
        title: props.title,
        project: props.projectId ? this.store.projects.get(props.projectId) ?? null : null,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
    } satisfies IssuePropsRefd;
  }


  private makePropProxy(initialState: IssuePropsRefd) {
    return new Proxy(initialState, {
        set: (target, prop, value) => {
          if (isKeyOf(prop, target)) {
            const oldProps = this.serializeProps(target);
            const newProps = this.serializeProps({ ...target, [prop]: value });
            this.store.addChange({
              operation: "update",
              model: "issue",
              id: this.id,
              props: {
                [prop]: {
                  old: oldProps[prop],
                  new: newProps[prop],
                },
              }),
            });
            (target as any)[prop] = value;
          }
          return true;
        },
      });
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

  get createdAt() {
    return this._state.createdAt;
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

  getIssues(): IterableIterator<IssueModel> {
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


function serializeIssueProps(props: IssuePropsRefd): IssueProps {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      if (key === "project") {
        return ["projectId", (value as ProjectModel).id]; // TODO a little sketch
      }
      return [key, value];
    })
  ) as IssueProps; // TODO sketch?
}

function trackIssueProps(initialState: IssueProps, model: IssueModel): IssueProps {
  return new Proxy(initialState, {
    set: (target, prop, value) => {
      if (isKeyOf(prop, target)) {
        const oldProps = serializeState({ [prop]: target[prop] });
        const newProps = serializeState({ [prop]: value });
        const event: UpdateEvent<IssueData> = {
          operation: "update",
          model: model.name,
          id: model.id,
          props: 
        };
        (target as any)[prop] = value;
      }
      return true;
    },
  });
}

function makeTracking<T extends ModelData>(initialState: T, model: BaseModel): T {
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

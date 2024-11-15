import { observable, reaction, runInAction } from "mobx";
import {
  Event,
  ModelName,
  ModelIssueProps,
  ModelProjectProps,
  ModelRelationProps,
  SerializedIssue,
  SerializedProject,
  SerializedRelation,
} from "./types";

class Store {
  private undoStack: Event[][] = [];
  private redoStack: Event[][] = [];
  private stagedChanges: Event[] = [];
  private eventSubscribers = new Set<(event: Event) => void>();
  private autoCommitDisposer: (() => void) | null = null;
  isTrackingChanges = true;
  // We use this to trigger the reactions rather than tracking the array
  // because you're not supposed to mutate arrays in reactions.
  private lastStagedChangeTimestamp = observable.box(0);

  models = {
    issue: new Map<string, Issue>(),
    project: new Map<string, Project>(),
    relation: new Map<string, Relation>(),
  };

  constructor() {
    this.startAutoCommit();
  }

  getModel(model: ModelName, id: string): Model | undefined {
    return this.models[model].get(id);
  }

  emitEvent(event: Event) {
    if (this.isTrackingChanges) {
      this.stagedChanges.push(event);
      this.lastStagedChangeTimestamp.set(Date.now());
    }
    for (const subscriber of this.eventSubscribers) {
      subscriber(event);
    }
  }

  applyEvent(event: Event) {
    this.isTrackingChanges = true;
    try {
      switch (event.operation) {
        case "create":
          switch (event.model) {
            case "project":
              this.createProject(event.id, event.props ?? {});
              break;
            case "issue":
              this.createIssue(event.id, event.props ?? {});
              break;
            case "relation":
              this.createRelation(event.id, event.props ?? {});
              break;
            default:
              event.model satisfies never;
          }
          break;
        case "update":
          if (event.propKey) {
            const model = getModel(event.model, event.id);
            if (model) {
              (model as any)[event.propKey] = event.newValue;
            }
          }
          break;
        case "delete":
          models[event.model].delete(event.id);
          break;
        case "set": {
          switch (event.model) {
            case "project": {
              setProject({ id: event.id, ...event.newProps });
              break;
            }
            case "issue": {
              setIssue({ id: event.id, ...event.newProps });
              break;
            }
            case "relation": {
              setRelation({ id: event.id, ...event.newProps });
              break;
            }
          }
          break;
        }
        default:
          event satisfies never;
      }
    } finally {
      this.isTrackingChanges = false;
    }
  }

  subscribe(subscriber: (event: Event) => void) {
    this.eventSubscribers.add(subscriber);
    return () => this.eventSubscribers.delete(subscriber);
  }

  // Undo/Redo methods
  undo() {
    const changes = this.undoStack.pop();
    if (changes) {
      const reversedChanges = changes.map(reverseEvent).reverse();
      this.redoStack.push(reversedChanges);
      for (const event of reversedChanges) {
        this.applyEvent(event);
      }
    }
  }

  redo() {
    const changes = this.redoStack.pop();
    if (changes) {
      this.undoStack.push(changes);
      for (const event of changes) {
        this.applyEvent(event);
      }
    }
  }

  commit() {
    if (this.stagedChanges.length > 0) {
      this.undoStack.push(this.stagedChanges);
      this.redoStack.length = 0;
      this.stagedChanges = [];
    }
  }

  startAutoCommit() {
    this.autoCommitDisposer = reaction(
      () => this.lastStagedChangeTimestamp.get(),
      () => this.commit()
    );
  }

  stopAutoCommit() {
    this.autoCommitDisposer?.();
    this.autoCommitDisposer = null;
  }

  createProject(id: string, props: Partial<ModelProjectProps>) {
    const project = new Project(id, props);
    this.models.project.set(id, project);
    this.emitEvent({ operation: "create", model: "project", id, props });
    return project;
  }

  createIssue(id: string, props: Partial<ModelIssueProps>) {
    const issue = new Issue(id, props);
    this.models.issue.set(id, issue);
    this.emitEvent({ operation: "create", model: "issue", id, props });
    return issue;
  }

  createRelation(id: string, props: Partial<ModelRelationProps>) {
    const relation = new Relation(id, props);
    this.models.relation.set(id, relation);
    this.emitEvent({ operation: "create", model: "relation", id, props });
    return relation;
  }

  setIssue(props: SerializedIssue) {
    return withIsTrackingChanges(false, () => {
      const existing = this.models.issue.get(props.id);
      if (existing) {
        existing.set(props);
        return existing;
      } else {
        let project: Project | null = null;
        if (props.projectId) {
          project = this.models.project.get(props.projectId as string) ?? null;
          if (!project) {
            project = new Project(props.projectId as string, {
              title: "",
              placeholder: true,
            });
            this.models.project.set(props.projectId as string, project);
          }
        }
        const issue = new Issue(props.id, { ...props, project });
        this.models.issue.set(props.id, issue);
        return issue;
      }
    });
  }

  setProject(props: SerializedProject) {
    return withIsTrackingChanges(false, () => {
      const existing = this.models.project.get(props.id);
      if (existing) {
        existing.set(props);
        return existing;
      } else {
        const project = new Project(props.id, props);
        this.models.project.set(props.id, project);
        return project;
      }
    });
  }

  setRelation(props: SerializedRelation) {
    return withIsTrackingChanges(false, () => {
      let from: Issue | null = null;
      let to: Issue | null = null;
      if (props.fromId) {
        from = this.models.issue.get(props.fromId as string) ?? null;
        if (!from) {
          from = new Issue(props.fromId as string, { title: "", placeholder: true });
          this.models.issue.set(props.fromId as string, from);
        }
      }
      if (props.toId) {
        to = this.models.issue.get(props.toId as string) ?? null;
        if (!to) {
          to = new Issue(props.toId as string, { title: "", placeholder: true });
          this.models.issue.set(props.toId as string, to);
        }
      }
      const deserializedProps = { ...props, from, to };
      const existing = this.models.relation.get(props.id);
      if (existing) {
        existing.set(deserializedProps);
        return existing;
      } else {
        const relation = new Relation(props.id, deserializedProps);
        this.models.relation.set(props.id, relation);
        return relation;
      }
    });
  }
}

let _store: Store | null = null;

export function init() {
  if (_store) return _store;
  _store = new Store();
  return _store;
}

// Helpers

function withIsTrackingChanges<T>(value: boolean, fn: () => T): T {
  if (!_store) {
    return fn();
  }
  const previous = _store.isTrackingChanges;
  _store.isTrackingChanges = value;
  try {
    return fn();
  } finally {
    _store.isTrackingChanges = previous;
  }
}

function reverseEvent(event: Event): Event {
  switch (event.operation) {
    case "create":
      return { operation: "delete", model: event.model, id: event.id };
    case "delete":
      return { operation: "create", model: event.model, id: event.id, props: event.props };
    case "update":
      return {
        operation: "update",
        model: event.model,
        id: event.id,
        propKey: event.propKey,
        oldValue: event.newValue,
        newValue: event.oldValue,
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

// Model decorators

const Property = (serializedName?: string) => {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    const propName = String(context.name);

    return {
      get() {
        return observableResult.get?.call(this);
      },
      set(newValue: any) {
        const oldValue = observableResult.get?.call(this);
        _store?.emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey: getSerializedProp(this.model, propName),
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: any) {
        registerPropMapping(this.model, propName, serializedName);
        return observableResult.init?.call(this, value);
      },
    };
  };
};

const ForeignKey = (serializedName?: string) => {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    const propName = String(context.name);

    return {
      get() {
        return observableResult.get?.call(this);
      },
      set(newValue: any) {
        const oldValue = observableResult.get?.call(this);
        _store?.emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey: getSerializedProp(this.model, propName),
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: any) {
        registerPropMapping(this.model, propName, serializedName);
        return observableResult.init?.call(this, value);
      },
    };
  };
};

class Backlinks<T extends Model> implements Iterable<T> {
  private map = new Map<string, T>();
  unsubscribe: (() => void) | null = null;

  constructor(private owner: Model, link: { from: ModelName; key: string }) {
    this.unsubscribe = subscribe((event) => {
      if (event.model === link.from) {
        if (event.operation === "delete" && this.map.has(event.id)) {
          this.map.delete(event.id);
        } else if (event.operation === "update" && event.propKey === link.key) {
          if (event.oldValue === this.owner.id) {
            this.map.delete(event.id);
          }
          if (event.newValue === this.owner.id) {
            const model = getModel(link.from, event.id);
            if (model) this.map.set(event.id, model);
          }
        }
      }
    });
  }

  [Symbol.iterator](): Iterator<T> {
    return this.map.values();
  }
}

// Models
interface Model {
  id: string;
  model: ModelName;
  placeholder: boolean;
}

class Issue implements Model {
  readonly model = "issue" as const;
  placeholder = false;

  constructor(readonly id: string, props: Partial<ModelIssueProps> = {}) {
    this.title = props.title ?? "";
    this.project = props.project ?? null;
    this.placeholder = props.placeholder ?? false;
  }

  @Property()
  accessor title = "";

  @ForeignKey("projectId")
  accessor project: Project | null = null;

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "fromId" });
  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "toId" });

  set(props: Partial<ModelIssueProps>) {
    this.title = props.title ?? "";
    this.project = props.project ?? null;
  }
}

class Project implements Model {
  readonly model = "project" as const;
  placeholder = false;

  constructor(readonly id: string, props: Partial<ModelProjectProps> = {}) {
    this.title = props.title ?? "";
    this.placeholder = props.placeholder ?? false;
  }

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "projectId" });

  set(props: Partial<ModelProjectProps>) {
    this.title = props.title ?? "";
  }
}

class Relation implements Model {
  readonly model = "relation" as const;
  placeholder = false;

  constructor(readonly id: string, props: Partial<ModelRelationProps> = {}) {
    this.from = props.from ?? null;
    this.to = props.to ?? null;
    this.placeholder = props.placeholder ?? false;
  }

  @ForeignKey("fromId")
  accessor from: Issue | null = null;

  @ForeignKey("toId")
  accessor to: Issue | null = null;

  set(props: Partial<ModelRelationProps>) {
    this.from = props.from ?? null;
    this.to = props.to ?? null;
  }
}

// Load initial data
const store = init();
const issue1 = store.setIssue({ id: "i1", title: "Issue 1", projectId: "p1" });
const project1 = store.setProject({ id: "p1", title: "Project 1" });

// Make changes
runInAction(() => {
  project1.title = "Updated Title";
});

// Archive

const modelMetadata = new Map<string, Map<string, string>>();

function registerPropMapping(model: ModelName, modelProp: string, serializedProp?: string) {
  if (!modelMetadata.has(model)) {
    modelMetadata.set(model, new Map());
  }
  modelMetadata.get(model)!.set(modelProp, serializedProp ?? modelProp);
}

function getSerializedProp(model: ModelName, prop: string): string {
  return modelMetadata.get(model)?.get(prop) ?? prop;
}

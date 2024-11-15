import { observable, reaction, runInAction } from "mobx";
import { Event, ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "./types";

class Store {
  private undoStack: Event[][] = [];
  private redoStack: Event[][] = [];

  private stagedChanges: Event[] = [];

  private eventSubscribers = new Set<(event: Event) => void>();
  private autoCommitDisposer: (() => void) | null = null;

  private isQueuingEventsToPush = true;

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

  getModel(model: ModelName, id: string): IModel | undefined {
    return this.models[model].get(id);
  }

  emitEvent(event: Event) {
    if (this.isQueuingEventsToPush) {
      this.stagedChanges.push(event);
      this.lastStagedChangeTimestamp.set(Date.now());
    }
    for (const subscriber of this.eventSubscribers) {
      subscriber(event);
    }
  }

  applyEvent(event: Event) {
    this.isQueuingEventsToPush = true;
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
          this.models[event.model].delete(event.id);
          break;
        case "set": {
          switch (event.model) {
            case "project": {
              this.setProject({ id: event.id, ...event.newProps });
              break;
            }
            case "issue": {
              this.setIssue({ id: event.id, ...event.newProps });
              break;
            }
            case "relation": {
              this.setRelation({ id: event.id, ...event.newProps });
              break;
            }
          }
          break;
        }
        default:
          event satisfies never;
      }
    } finally {
      this.isQueuingEventsToPush = false;
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

  setIssue(props: SerializedIssue) {
    return this.withEventQueuingDisabled(() => {
      const existing = this.models.issue.get(props.id);
      if (existing) {
        existing.set(props);
        return existing;
      } else {
        const project = props.projectId
          ? this.getProjectOrCreatePlaceholder(props.projectId)
          : null;
        return new Issue(props.id, { ...props, project });
      }
    });
  }

  setProject(props: SerializedProject) {
    return this.withEventQueuingDisabled(() => {
      const existing = this.models.project.get(props.id);
      if (existing) {
        existing.set(props);
        return existing;
      } else {
        return new Project(props.id, props);
      }
    });
  }

  setRelation(props: SerializedRelation) {
    return this.withEventQueuingDisabled(() => {
      const from = props.fromId ? this.getIssueOrCreatePlaceholder(props.fromId) : null;
      const to = props.toId ? this.getIssueOrCreatePlaceholder(props.toId) : null;
      const deserializedProps = { ...props, from, to };
      const existing = this.models.relation.get(props.id);
      if (existing) {
        existing.set(deserializedProps);
        return existing;
      } else {
        return new Relation(props.id, deserializedProps);
      }
    });
  }

  private getProjectOrCreatePlaceholder(id: string) {
    const project = this.models.project.get(id);
    if (project) return project;
    return new Project(id, { title: "", placeholder: true });
  }

  private getIssueOrCreatePlaceholder(id: string) {
    const issue = this.models.issue.get(id);
    if (issue) return issue;
    return new Issue(id, { title: "", placeholder: true });
  }

  withEventQueuingDisabled<T>(fn: () => T): T {
    const previous = this.isQueuingEventsToPush;
    this.isQueuingEventsToPush = false;
    try {
      return fn();
    } finally {
      this.isQueuingEventsToPush = previous;
    }
  }
}

const _store = new Store();

// Helpers

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
  return <T extends IModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const propKey = serializedName ?? String(context.name);

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        _store?.emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
    };
  };
};

const keyMaps: { model: ModelName; modelKey: string; serializedKey: string }[] = [];
function getSerializedKey(model: ModelName, modelKey: string) {
  const keyMap = keyMaps.find((k) => k.model === model && k.modelKey === modelKey);
  return keyMap?.serializedKey ?? modelKey;
}

const ForeignKey = (serializedKey?: string) => {
  return <T extends IModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const propKey = serializedKey ?? String(context.name);

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        _store?.emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey,
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        if (serializedKey) {
          keyMaps.push({ model: this.model, modelKey: propKey, serializedKey });
        }
        return observableResult.init?.call(this, value);
      },
    };
  };
};

class Backlinks<T extends IModel> implements Iterable<T> {
  private map = new Map<string, T>();
  unsubscribe: (() => void) | null = null;

  constructor(private owner: IModel, private link: { from: ModelName; key: string }) {
    if (!_store) {
      return;
    }
    this.unsubscribe = _store.subscribe((event) => {
      if (event.model === link.from) {
        if (event.operation === "delete" && this.map.has(event.id)) {
          this.map.delete(event.id);
        } else if (event.operation === "create") {
          const model = _store?.getModel(link.from, event.id);
          if (model) this.map.set(event.id, model);
        } else if (
          event.operation === "update" &&
          event.propKey === getSerializedKey(link.from, link.key)
        ) {
          if (event.oldValue === this.owner.id) {
            this.map.delete(event.id);
          }
          if (event.newValue === this.owner.id) {
            const model = _store?.getModel(link.from, event.id);
            if (model) this.map.set(event.id, model);
          }
        }
      }
    });
  }

  delete(id: string) {
    const model = this.map.get(id);
    if (model) {
      this.map.delete(id);
      model[this.link.key] = null;
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.map.values();
  }
}

// Models
interface IModel {
  id: string;
  model: ModelName;
  placeholder: boolean;
  set(props: any): void;
}

export type ModelIssueProps = {
  title: string;
  project: Project | null;
  placeholder: boolean;
};

export type ModelProjectProps = {
  title: string;
  placeholder: boolean;
};

export type ModelRelationProps = {
  from: Issue | null;
  to: Issue | null;
  placeholder: boolean;
};

const Model = (value: any, { kind }: ClassDecoratorContext) => {
  if (kind === "class") {
    return function (id: string, props: any) {
      const inst = new value(id, props);
      _store.models[inst.model].set(inst.id, inst);
      _store.emitEvent({ operation: "create", model: inst.model, id, props });
    };
  }
  return value;
};

@Model
class Issue implements IModel {
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

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "from" });
  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "to" });

  set(props: Partial<ModelIssueProps>) {
    this.title = props.title ?? "";
    this.project = props.project ?? null;
  }
}

@Model
class Project implements IModel {
  readonly model = "project" as const;
  placeholder = false;

  constructor(readonly id: string, props: Partial<ModelProjectProps> = {}) {
    this.title = props.title ?? "";
    this.placeholder = props.placeholder ?? false;
  }

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "project" });

  set(props: Partial<ModelProjectProps>) {
    this.title = props.title ?? "";
  }
}

@Model
class Relation implements IModel {
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
const store = _store;
const issue1 = store.setIssue({ id: "i1", title: "Issue 1", projectId: "p1" });
const issue2 = store.setIssue({ id: "i2", title: "Issue 2", projectId: "p1" });
const project1 = store.setProject({ id: "p1", title: "Project 1" });
const project2 = store.setProject({ id: "p2", title: "Project 2" });

// Make changes
runInAction(() => {
  project1.title = "Updated Title";
  project1.issues.delete("i1");
});

const relation: Relation | null = null;
runInAction(() => {
  issue2.project = project2;
  // relation = store.setRelation({ id: "r1", from: issue1, to: issue2 });
});

console.log(project1.issues);

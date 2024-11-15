import { observable, reaction, runInAction } from "mobx";
import { Event, ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "./types";

type ModelProps<T extends SerializedIssue | SerializedProject | SerializedRelation> = Partial<
  Omit<T, "id">
> & { id: string; placeholder?: boolean };

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
              new Project(event.id, event.props ?? {});
              break;
            case "issue":
              new Issue(event.id, event.props ?? {});
              break;
            case "relation":
              new Relation(event.id, event.props ?? {});
              break;
            default:
              event.model satisfies never;
          }
          break;
        case "update":
          if (event.propKey) {
            const model = this.getModel(event.model, event.id);
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

  getProjectOrCreatePlaceholder(id: string) {
    const project = this.models.project.get(id);
    if (project) return project;
    return new Project({ id, title: "", placeholder: true });
  }

  getIssueOrCreatePlaceholder(id: string) {
    const issue = this.models.issue.get(id);
    if (issue) return issue;
    return new Issue({ id, title: "", placeholder: true });
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
  readonly id: string;
  placeholder: boolean;
  set(props: any): void;
}

const ModelClassToName = new Map<any, ModelName>();

const Model = (name: ModelName) => {
  return (value: any, { kind }: ClassDecoratorContext) => {
    if (kind === "class") {
      ModelClassToName.set(value, name);
      return function (props: any) {
        if (_store.getModel(name, props.id)) {
          throw new Error(`Model ${name} with id ${props.id} already exists`);
        }
        const inst = new value(props);
        _store.models[name].set(inst.id, inst);
        _store.emitEvent({ operation: "create", model: name, id: inst.id, props });
        return inst;
      };
    }
    return value;
  };
};

type ModelTypeMap = {
  project: Project;
  issue: Issue;
  relation: Relation;
};

function resolveRef<T extends ModelName>(
  model: T,
  id: string | undefined | null
): ModelTypeMap[T] | null;
function resolveRef(model: ModelName, id: string | undefined | null) {
  if (!id) return null;
  if (model === "project") {
    const project = _store.models.project.get(id);
    if (project) return project;
    return new Project({ id, title: "", placeholder: true });
  } else if (model === "issue") {
    const issue = _store.models.issue.get(id);
    if (issue) return issue;
    return new Issue({ id, title: "", placeholder: true });
  } else if (model === "relation") {
    const relation = _store.models.relation.get(id);
    if (relation) return relation;
    return new Relation({ id, fromId: null, toId: null, placeholder: true });
  } else {
    return model satisfies never;
  }
}

@Model("issue")
class Issue implements IModel {
  static readonly model = "issue" as const;
  readonly id: string;
  placeholder = false;

  constructor(props: ModelProps<SerializedIssue>) {
    this.id = props.id;
    this.title = props.title ?? "";
    this.project = resolveRef("project", props.projectId);
    this.placeholder = props.placeholder ?? false;
  }

  @Property()
  accessor title = "";

  @ForeignKey("projectId")
  accessor project: Project | null = null;

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "from" });
  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "to" });

  set(props: ModelProps<SerializedIssue>) {
    this.title = props.title ?? "";
    this.project = props.projectId ? _store.getProjectOrCreatePlaceholder(props.projectId) : null;
  }
}

@Model("project")
class Project implements IModel {
  readonly id: string;
  placeholder = false;

  constructor(props: ModelProps<SerializedProject>) {
    this.id = props.id;
    this.title = props.title ?? "";
    this.placeholder = props.placeholder ?? false;
  }

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "project" });

  set(props: ModelProps<SerializedProject>) {
    this.title = props.title ?? "";
  }
}

@Model("relation")
class Relation implements IModel {
  readonly id: string;
  placeholder = false;

  constructor(props: ModelProps<SerializedRelation>) {
    this.id = props.id;
    this.from = resolveRef("issue", props.fromId);
    this.to = resolveRef("issue", props.toId);
    this.placeholder = props.placeholder ?? false;
  }

  @ForeignKey("fromId")
  accessor from: Issue | null = null;

  @ForeignKey("toId")
  accessor to: Issue | null = null;

  set(props: ModelProps<SerializedRelation>) {
    this.from = resolveRef("issue", props.fromId);
    this.to = resolveRef("issue", props.toId);
  }
}

// Load initial data
const issue1 = new Issue({ id: "i1", title: "Issue 1", projectId: "p1" });
const issue2 = new Issue({ id: "i2", title: "Issue 2", projectId: "p1" });
const project1 = new Project({ id: "p1", title: "Project 1" });
const project2 = new Project({ id: "p2", title: "Project 2" });

// Make changes
runInAction(() => {
  project1.title = "Updated Title";
  issue1.project = project2;
});

console.log(project1.issues);

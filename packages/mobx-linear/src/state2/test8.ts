import { observable, reaction, runInAction } from "mobx";
import { Event, ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "./types";

type ModelProps<T extends SerializedIssue | SerializedProject | SerializedRelation> = Partial<
  Omit<T, "id">
> & { id: string; placeholder?: boolean };

interface IModel {
  readonly id: string;
  placeholder: boolean;
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

// Store

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

  models: Record<
    ModelName,
    {
      properties: Record<string, string>;
      foreignKeys: Record<string, { referencedModelName: ModelName; serializedKey: string }>;
      instances: Map<string, IModel>;
      class: any;
    }
  > = {
    issue: {
      properties: {},
      foreignKeys: {},
      class: null,
      instances: new Map<string, Issue>(),
    },
    project: {
      properties: {},
      foreignKeys: {},
      class: null,
      instances: new Map<string, Project>(),
    },
    relation: {
      properties: {},
      foreignKeys: {},
      class: null,
      instances: new Map<string, Relation>(),
    },
  };

  constructor() {
    this.startAutoCommit();
  }

  getModel(model: ModelName, id: string): IModel | undefined {
    return this.models[model].instances.get(id);
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
          this.models[event.model].instances.delete(event.id);
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

const store = new Store();

// Model decorators

function constructorToModelName(value: any): ModelName {
  for (const [modelName, props] of Object.entries(store.models)) {
    if (props.class === value) {
      return modelName as ModelName;
    }
  }
  throw new Error("Unknown model class");
}

function getSerializedForeignKey(model: ModelName, modelKey: string) {
  return store.models[model].foreignKeys[modelKey]?.serializedKey ?? modelKey;
}

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
        store?.emitEvent({
          operation: "update",
          model: constructorToModelName(this.constructor),
          id: this.id,
          propKey,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        if (serializedName) {
          const modelName = constructorToModelName(this.constructor);
          store.models[modelName].properties[propKey] = serializedName;
        }
        return observableResult.init?.call(this, value);
      },
    };
  };
};

const ForeignKey = (serializedKey: string, referencedModelName: ModelName) => {
  return <T extends IModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const modelKey = String(context.name);

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        store?.emitEvent({
          operation: "update",
          model: constructorToModelName(this.constructor),
          id: this.id,
          propKey: serializedKey,
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        if (serializedKey) {
          const modelName = constructorToModelName(this.constructor);
          store.models[modelName].foreignKeys[modelKey] = {
            referencedModelName: referencedModelName,
            serializedKey: serializedKey,
          };
        }
        return observableResult.init?.call(this, value);
      },
    };
  };
};

const Model = (name: ModelName) => {
  return (value: any, { kind }: ClassDecoratorContext) => {
    if (kind === "class") {
      store.models[name].class = value;
      return function (props: any) {
        const inst = store.getModel(name, props.id) ?? new value(props);
        // Resolve foreign keys to instances
        Object.entries(store.models[name].foreignKeys).forEach(
          ([modelKey, { referencedModelName, serializedKey: serializedKey }]) => {
            if (props[serializedKey]) {
              const referencedId = props[serializedKey];
              let referencedInst: IModel | null = null;
              if (referencedId) {
                const inst = store.getModel(referencedModelName, referencedId);
                if (inst) {
                  referencedInst = inst;
                } else {
                  referencedInst = new store.models[referencedModelName].class({
                    id: referencedId,
                    placeholder: true,
                  });
                }
              }
              inst[modelKey] = referencedInst;
            }
          }
        );
        // Set properties
        Object.entries(store.models[name].properties).forEach(([key, serializedKey]) => {
          if (props[serializedKey]) {
            inst[key] = props[serializedKey];
          }
        });
        if (props.placeholder !== undefined) {
          inst.placeholder = props.placeholder;
        }
        store.models[name].instances.set(inst.id, inst);
        store.emitEvent({ operation: "create", model: name, id: inst.id, props });
        return inst;
      };
    }
    return value;
  };
};

class Backlinks<T extends IModel> implements Iterable<T> {
  private map = new Map<string, T>();
  unsubscribe: (() => void) | null = null;

  constructor(private owner: IModel, private link: { from: ModelName; key: string }) {
    if (!store) {
      return;
    }
    this.unsubscribe = store.subscribe((event) => {
      if (event.model === link.from) {
        if (event.operation === "delete" && this.map.has(event.id)) {
          this.map.delete(event.id);
        } else if (event.operation === "create") {
          const model = store?.getModel(link.from, event.id);
          if (model) this.map.set(event.id, model);
        } else if (
          event.operation === "update" &&
          event.propKey === getSerializedForeignKey(link.from, link.key)
        ) {
          if (event.oldValue === this.owner.id) {
            this.map.delete(event.id);
          }
          if (event.newValue === this.owner.id) {
            const model = store?.getModel(link.from, event.id);
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

@Model("issue")
class Issue implements IModel {
  constructor(props: ModelProps<SerializedIssue>) {
    this.id = props.id;
  }
  readonly id: string;

  placeholder = false;

  @Property()
  accessor title = "";

  @ForeignKey("projectId", "project")
  accessor project: Project | null = null;

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "from" });
  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "to" });
}

@Model("project")
class Project implements IModel {
  constructor(props: ModelProps<SerializedProject>) {
    this.id = props.id;
  }

  readonly id: string;

  placeholder = false;

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "project" });
}

@Model("relation")
class Relation implements IModel {
  constructor(props: ModelProps<SerializedRelation>) {
    this.id = props.id;
  }

  readonly id: string;

  placeholder = false;

  @ForeignKey("fromId", "issue")
  accessor from: Issue | null = null;

  @ForeignKey("toId", "issue")
  accessor to: Issue | null = null;
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

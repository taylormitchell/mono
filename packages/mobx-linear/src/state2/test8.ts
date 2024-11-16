import { action, observable, reaction, runInAction } from "mobx";
import { Event, ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "./types";

function uuid() {
  return crypto.randomUUID();
}

type ModelProps<T extends SerializedIssue | SerializedProject | SerializedRelation> = Partial<T> & {
  placeholder?: boolean;
};

interface IModel {
  readonly id: string;
  placeholder: boolean;
}

const modelMetadata = Symbol("modelMetadata");

type ModelMetadata = {
  name: ModelName;
  properties: Record<string, { serializedKey: string }>;
  foreignKeys: Record<string, { referencedModelName: ModelName; serializedKey: string }>;
};

function getModelMetadata(model: any): ModelMetadata {
  const metadata = model[modelMetadata];
  if (!metadata) {
    throw new Error(`Unknown model ${model}`);
  }
  return metadata;
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

type ModelData<
  T extends Project | Issue | Relation,
  S extends SerializedProject | SerializedIssue | SerializedRelation
> = {
  create: (props: ModelProps<S>) => T;
  get: (id: string) => T | undefined;
  getAll: () => T[];
  delete: (id: string) => void;
};

function createInitialModelData(name: ModelName) {
  const msg = `Did you forget to add decorator @Model(${name}) to the class?`;
  return {
    create: () => {
      throw new Error(`Create method not set. ${msg}`);
    },
    delete: () => {
      throw new Error(`Delete method not set. ${msg}`);
    },
    get: () => {
      throw new Error(`Get method not set. ${msg}`);
    },
    getAll: () => {
      throw new Error(`Get all method not set. ${msg}`);
    },
  };
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

  models: {
    issue: ModelData<Issue, SerializedIssue>;
    project: ModelData<Project, SerializedProject>;
    relation: ModelData<Relation, SerializedRelation>;
  } = {
    issue: createInitialModelData("issue"),
    project: createInitialModelData("project"),
    relation: createInitialModelData("relation"),
  };

  constructor() {
    this.startAutoCommit();
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

  private applyEvent(event: Event) {
    switch (event.operation) {
      case "create":
        switch (event.model) {
          case "project":
            this.models.project.create(event.props ?? {});
            break;
          case "issue":
            this.models.issue.create(event.props ?? {});
            break;
          case "relation":
            this.models.relation.create(event.props ?? {});
            break;
          default:
            event.model satisfies never;
        }
        break;
      case "update":
        if (event.propKey) {
          const model = this.models[event.model].get(event.id);
          if (!model) {
            throw new Error(`Unknown model ${event.model} with id ${event.id}`);
          }
          (model as any)[event.propKey] = event.newValue;
        }
        break;
      case "delete":
        this.models[event.model].delete(event.id);
        break;
      default:
        event satisfies never;
    }
    for (const subscriber of this.eventSubscribers) {
      subscriber(event);
    }
  }

  subscribe(subscriber: (event: Event) => void) {
    this.eventSubscribers.add(subscriber);
    return () => this.eventSubscribers.delete(subscriber);
  }

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

  // sync

  applyRemoteEvent(event: Event) {
    this.withEventQueuingDisabled(() => {
      this.applyEvent(event);
    });
  }
}

const store = new Store();

// Model decorators

function getSerializedForeignKey(model: ModelName, modelKey: string) {
  return store.models[model].foreignKeys[modelKey]?.serializedKey ?? modelKey;
}

const Property = (_serializedKey?: string) => {
  return <T extends IModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const modelKey = String(context.name);
    const serializedKey = _serializedKey ?? modelKey;

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        store?.emitEvent({
          operation: "update",
          model: getModelMetadata(this.constructor).name,
          id: this.id,
          propKey: serializedKey,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        const metadata = getModelMetadata(this.constructor);
        metadata.properties[modelKey] = { serializedKey };
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
          model: getModelMetadata(this.constructor).name,
          id: this.id,
          propKey: serializedKey,
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        if (serializedKey) {
          const metadata = getModelMetadata(this.constructor);
          metadata.foreignKeys[modelKey] = {
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
  return (cls: any) => {
    cls[modelMetadata] = { name, properties: {}, foreignKeys: {} };
    const instances = new Map<string, any>();
    store.models[name] = {
      // TODO: Should somehow make it more obvious that this is creating a new instance
      // or if one already exists, updating the existing one. And maybe the event should
      // be different between the two.
      create: action("create", (props: any) => {
        const existing = props.id ? store.models[name].get(props.id) : undefined;
        const inst = existing ?? new cls();
        // If we created a new instance, the class constructor will have assigned a new
        // random id. If the user provided an id, we should use that instead.
        if (!existing && props.id) {
          inst.id = props.id;
        }
        // Placeholder instances are created by passing placeholder: true to the
        // create method (see below). If it's not provided, then we have the
        // real model data in which case we flip the placeholder flag to false.
        inst.placeholder = props.placeholder ?? false;
        // Resolve foreign key to existing or placeholder instance
        Object.entries(getModelMetadata(cls).foreignKeys).forEach(
          ([modelKey, { referencedModelName, serializedKey: serializedKey }]) => {
            if (props[serializedKey]) {
              const referencedId = props[serializedKey];
              if (referencedId) {
                inst[modelKey] =
                  store.models[referencedModelName].get(referencedId) ??
                  store.models[referencedModelName].create({ id: referencedId, placeholder: true });
              } else {
                inst[modelKey] = null;
              }
            }
          }
        );
        // Set properties
        Object.entries(getModelMetadata(cls).properties).forEach(
          ([modelKey, { serializedKey }]) => {
            if (props[serializedKey]) {
              inst[modelKey] = props[serializedKey];
            }
          }
        );
        if (!existing) {
          instances.set(inst.id, inst);
        }
        // TODO: Maybe condition on existing/new
        store.emitEvent({ operation: "create", model: name, id: inst.id, props });
        return inst;
      }),
      delete: action("delete", (id: string) => {
        const inst = instances.get(id);
        if (inst) {
          // TODO: We could probably make this a little cleaner if we use decorators
          // in some way.
          Object.values(inst).forEach((prop) => {
            if (prop instanceof Backlinks) {
              prop.unsubscribe();
            }
          });
        }
        store.emitEvent({ operation: "delete", model: name, id });
        instances.delete(id);
      }),
      get: (id: string) => instances.get(id),
      getAll: () => Array.from(instances.values()),
    };
    return cls;
  };
};

class Backlinks<T extends IModel> implements Iterable<T> {
  private map = new Map<string, T>();
  unsubscribe: () => void;

  constructor(private owner: IModel, private link: { from: ModelName; key: string }) {
    this.unsubscribe = store.subscribe((event) => {
      if (event.model === link.from) {
        if (event.operation === "delete" && this.map.has(event.id)) {
          this.map.delete(event.id);
          return;
        }
        const modelReferencingOwner = store.models[link.from].get(event.id);
        if (!modelReferencingOwner) {
          console.warn(`Received event for unknown model ${link.from} with id ${event.id}`);
          return;
        }
        if (event.operation === "create") {
          this.map.set(event.id, modelReferencingOwner);
          return;
        }
        const serializedForeignKey = modelReferencingOwner
          ? getModelMetadata(modelReferencingOwner.constructor).foreignKeys[link.key].serializedKey
          : null;
        if (event.operation === "update" && event.propKey === serializedForeignKey) {
          if (event.oldValue === this.owner.id) {
            this.map.delete(event.id);
          }
          if (event.newValue === this.owner.id) {
            this.map.set(event.id, modelReferencingOwner);
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

function BacklinkDecorator(link: { model: ModelName; key: string }) {
  return <T extends IModel>(target: any, context: ClassAccessorDecoratorContext) => {
    class BacklinksSet<T extends IModel> implements Set<T> {
      private map = observable.map<string, T>();
      unsubscribe: () => void;
      constructor() {
        this.unsubscribe = store.subscribe((event) => {
          if (event.model === link.from) {
            if (event.operation === "delete" && this.has(event.id)) {
              this.map.delete(event.id);
              return;
            }
            const modelReferencingOwner = store.models[link.from].get(event.id);
            if (!modelReferencingOwner) {
              console.warn(`Received event for unknown model ${link.from} with id ${event.id}`);
              return;
            }
            if (event.operation === "create") {
              this.map.set(event.id, modelReferencingOwner);
              return;
            }
            const serializedForeignKey = modelReferencingOwner
              ? getModelMetadata(modelReferencingOwner.constructor).foreignKeys[link.key]
                  .serializedKey
              : null;
            if (event.operation === "update" && event.propKey === serializedForeignKey) {
              if (event.oldValue === this.owner.id) {
                this.map.delete(event.id);
              }
              if (event.newValue === this.owner.id) {
                this.map.set(event.id, modelReferencingOwner);
              }
            }
          }
        });
      }

      delete(id: string) {
        return this.map.delete(id);
      }

      add(value: T) {
        this.map.set(value.id, value);
      }

      clear() {
        this.map.clear();
      }
    }

    const modelKey = String(context.name);
    const serializedKey = _serializedKey ?? modelKey;

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        store?.emitEvent({
          operation: "update",
          model: getModelMetadata(this.constructor).name,
          id: this.id,
          propKey: serializedKey,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        const metadata = getModelMetadata(this.constructor);
        metadata.properties[modelKey] = { serializedKey };
        return observableResult.init?.call(this, value);
      },
    };
  };
}

type Collection<T extends IModel> = {
  [Symbol.iterator]: () => Iterator<T>;
  delete: (id: string) => boolean;
  add: (value: T) => void;
  clear: () => void;
  has: (id: string) => boolean;
  get: (id: string) => T | undefined;
};

// Models

@Model("issue")
class Issue implements IModel {
  readonly id: string = uuid();

  placeholder = false;

  @Property()
  accessor title = "";

  @ForeignKey("projectId", "project")
  accessor project: Project | null = null;

  @BacklinkDecorator({ model: "relation", key: "from" })
  test = new Set<Relation>();

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "from" });

  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "to" });
}

@Model("project")
class Project implements IModel {
  readonly id: string = uuid();

  placeholder = false;

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "project" });
}

@Model("relation")
class Relation implements IModel {
  readonly id: string = uuid();

  placeholder = false;

  @ForeignKey("fromId", "issue")
  accessor from: Issue | null = null;

  @ForeignKey("toId", "issue")
  accessor to: Issue | null = null;
}

// Load initial data
const issue1 = store.models.issue.create({ id: "i1", title: "Issue 1", projectId: "p1" });
store.models.issue.create({ id: "i2", title: "Issue 2", projectId: "p1" });
const issue2 = store.models.issue.get("i2");
const project1 = store.models.project.create({ id: "p1", title: "Project 1" });
const project2 = store.models.project.create({ id: "p2", title: "Project 2" });

// Make changes
runInAction(() => {
  project1.title = "Updated Title";
  issue1.project = project2;
});

console.log(project1.issues);

runInAction(() => {
  issue1.project = null;
});

console.log(project1.issues);

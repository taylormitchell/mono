import { action, observable, reaction, runInAction } from "mobx";
import { ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "../lib/types";

export type Event =
  | {
      operation: "create";
      model: ModelName;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      operation: "update";
      model: ModelName;
      id: string;
      propKey: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      operation: "delete";
      model: ModelName;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      operation: "addToBacklinks";
      model: ModelName;
      id: string;
      backlinkKey: string;
    }
  | {
      operation: "deleteFromBacklinks";
      model: ModelName;
      id: string;
      backlinkKey: string;
    };

/**
/**
 * TODO:
 - Get the new backlinks stuff working  
 - Then start implementing all the refactor ideas below
 */

function uuid() {
  return crypto.randomUUID();
}

type ModelProps<T extends SerializedIssue | SerializedProject | SerializedRelation> = Partial<T> & {
  placeholder?: boolean;
};

abstract class BaseModel {
  readonly id: string = uuid();
  placeholder: boolean = false;
}

const modelMetadata = Symbol("modelMetadata");

type ModelMetadata = {
  name: ModelName;
  properties: Record<string, { serializedKey: string }>;
  foreignKeys: Record<string, { referencedModelName: ModelName; serializedKey: string }>;
  backlinks: Record<string, { from: ModelName; key: string }>;
};

function getOrCreateModelMetadata(model: any): ModelMetadata {
  if (!model[modelMetadata]) {
    model[modelMetadata] = {
      name: model.name,
      properties: {},
      foreignKeys: {},
      backlinks: {},
    } satisfies ModelMetadata;
  }
  return model[modelMetadata];
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
    case "addToBacklinks":
      return {
        operation: "deleteFromBacklinks",
        model: event.model,
        id: event.id,
        backlinkKey: event.backlinkKey,
      };
    case "deleteFromBacklinks":
      return {
        operation: "addToBacklinks",
        model: event.model,
        id: event.id,
        backlinkKey: event.backlinkKey,
      };
    default:
      return event satisfies never;
  }
}

type ModelClass<T> = new (id?: string) => T;
type ModelRecord = Record<string, ModelClass<BaseModel>>;

type CRUD<T extends BaseModel> = {
  create: (props: Partial<T> & { id?: string; placeholder?: boolean }) => T;
  get: (id: string) => T | undefined;
  getAll: () => T[];
  delete: (id: string) => void;
};

type StoreModels<TModels extends ModelRecord> = {
  [K in keyof TModels]: CRUD<InstanceType<TModels[K]>>;
};

// Store

class Store<TModels extends ModelRecord> {
  private undoStack: Event[][] = [];
  private redoStack: Event[][] = [];

  private stagedChanges: Event[] = [];

  private eventSubscribers = new Set<(event: Event) => void>();
  private autoCommitDisposer: (() => void) | null = null;

  private isQueuingEventsToPush = true;

  // We use this to trigger the reactions rather than tracking the array
  // because you're not supposed to mutate arrays in reactions.
  private lastStagedChangeTimestamp = observable.box(0);

  models: StoreModels<TModels>;

  modelMetadata: Record<ModelName, ModelMetadata>;

  constructor(modelClasses: TModels) {
    if (globalStore) {
      throw new Error("Store already exists");
    }
    globalStore = this;
    this.models = {} as StoreModels<TModels>;
    this.modelMetadata = {} as Record<ModelName, ModelMetadata>;
    for (const [modelName, ModelClass] of Object.entries(modelClasses)) {
      const instances = new Map<string, InstanceType<typeof ModelClass>>();

      this.modelMetadata[modelName] = getOrCreateModelMetadata(ModelClass);

      (this.models as any)[modelName] = {
        create: action("create", (props: any) => {
          const existing = props.id ? instances.get(props.id) : undefined;
          const inst = existing ?? new ModelClass(props.id);

          // TODO: Is there actually any reason to do this after the fact? Like why not do the mapping
          // from ids to instances before instantiation and then pass them to the constructor?
          if (!existing) {
            // If we created a new instance, the class constructor will have assigned a new
            // random id. If the user provided an id, we should use that instead.
            if (props.id) {
              inst.id = props.id;
            }
            instances.set(inst.id, inst);
          }

          // Add store reference to instance
          (inst as any).store = this;
          (inst as any).modelName = modelName;

          // Placeholder instances are created by passing placeholder: true to the
          // create method (see below). If it's not provided, then we have the
          // real model data in which case we flip the placeholder flag to false.
          inst.placeholder = props.placeholder ?? false;

          // Handle foreign keys
          const metadata = getOrCreateModelMetadata(ModelClass);
          Object.entries(metadata.foreignKeys).forEach(
            ([modelKey, { referencedModelName, serializedKey }]) => {
              if (props[serializedKey]) {
                const referencedId = props[serializedKey];
                if (referencedId) {
                  inst[modelKey] =
                    this.models[referencedModelName].get(referencedId) ??
                    this.models[referencedModelName].create({
                      id: referencedId,
                      placeholder: true,
                    });
                } else {
                  inst[modelKey] = null;
                }
              }
            }
          );

          // Set properties
          Object.entries(metadata.properties).forEach(([modelKey, { serializedKey }]) => {
            if (props[serializedKey] !== undefined) {
              inst[modelKey] = props[serializedKey];
            }
          });

          // TODO: Maybe condition on existing/new
          this.emitEvent({
            operation: "create",
            model: modelName,
            id: inst.id,
            props,
          });

          return inst;
        }),
        delete: action("delete", (id: string) => {
          this.emitEvent({ operation: "delete", model: modelName, id });
          instances.delete(id);
        }),
        get: (id: string) => instances.get(id),
        getAll: () => Array.from(instances.values()),
      };
    }
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

  private applyEventAndNotifySubscribers(event: Event) {
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
        this.applyEventAndNotifySubscribers(event);
      }
    }
  }

  redo() {
    const changes = this.redoStack.pop();
    if (changes) {
      this.undoStack.push(changes);
      for (const event of changes) {
        this.applyEventAndNotifySubscribers(event);
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

  applyEvent(action: Event) {
    this.withEventQueuingDisabled(() => {
      this.applyEventAndNotifySubscribers(action);
    });
  }
}

let globalStore: Store<any> | null = null;
function createStore<TModels extends ModelRecord>(modelClasses: TModels) {
  if (globalStore) {
    throw new Error("Store already exists");
  }
  globalStore = new Store(modelClasses);
  return globalStore;
}

// Model decorators
// A pattern I'm kinda arriving at is that the decorator functions are mostly just responsible for:
// - Setting up the metadata
// - Emitting the right events
// Any side-effect mutations are handled by the store in response to events.

const property = (opts: { serializedKey?: string } = {}) => {
  return <T extends BaseModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const accessorName = String(context.name);
    const serializedKey = opts.serializedKey ?? `${accessorName}Id`;

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        // TODO Maybe this gets injected in during registration with the store? and so does
        // nothing in cases where the class is instantiated outside a store context?
        if (globalStore) {
          globalStore.emitEvent({
            operation: "update",
            model: getOrCreateModelMetadata(this.constructor).name,
            id: this.id,
            propKey: serializedKey,
            oldValue,
            newValue,
          });
        } else {
          console.warn("No store found when emitting update event");
        }
        return observableResult.set?.call(this, newValue);
      },
      init(this: T, value: any) {
        const metadata = getModelMetadata(this.constructor);
        metadata.properties[accessorName] = { serializedKey };
        return observableResult.init?.call(this, value);
      },
    };
  };
};

const link = (opts: { serializedKey?: string; modelName?: ModelName } = {}) => {
  return <T extends BaseModel>(target: any, context: ClassAccessorDecoratorContext) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to decorate property");
    }
    const accessorName = String(context.name);
    const serializedKey = opts.serializedKey ?? `${accessorName}Id`;
    const referencedModelName = opts.modelName ?? accessorName;

    return {
      get(this: T) {
        return observableResult.get?.call(this);
      },
      set(this: T, newValue: any) {
        const oldValue = observableResult.get?.call(this);
        const res = observableResult.set?.call(this, newValue);
        if (globalStore) {
          globalStore.emitEvent({
            operation: "update",
            model: getOrCreateModelMetadata(this.constructor).name,
            id: this.id,
            propKey: serializedKey,
            oldValue: oldValue?.id ?? null,
            newValue: newValue?.id ?? null,
          });
        } else {
          console.warn("No store found when emitting update event");
        }
        return res;
      },
      init(this: T, value: any) {
        if (serializedKey) {
          const metadata = getOrCreateModelMetadata(this.constructor);
          metadata.foreignKeys[accessorName] = {
            referencedModelName: referencedModelName,
            serializedKey: serializedKey,
          };
        }
        return observableResult.init?.call(this, value);
      },
    };
  };
};

function parseBacklinkRef(ref: string) {
  const parts = ref.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid backlink reference");
  }
  return parts as [string, string];
}

const backlinks = (ref: string) => {
  return (_: any, context: ClassFieldDecoratorContext) => {
    const backlinkKey = String(context.name);
    const [sourceModelName, sourceModelLinkKey] = parseBacklinkRef(ref);

    // TODO: We want this set up after the store is created. So maybe does make sense to
    // go in the constructor.
    // store.subscribe((event) => {
    //   if (event.model === sourceModelName) {
    //     const model = store.models[sourceModelName].get(event.id);
    //     if (!model) {
    //       console.warn(`Received event for unknown model ${sourceModelName} with id ${event.id}`);
    //       return;
    //     }
    //     const metadata = getOrCreateModelMetadata(model.constructor);
    //     const referencedModelName = metadata.foreignKeys[sourceModelLinkKey].referencedModelName;
    //     if (!referencedModelName) {
    //       console.warn(`No referenced model name for ${sourceModelName}.${sourceModelLinkKey}`);
    //       return;
    //     }

    //     if (event.operation === "delete") {
    //       const referencedModel = model[sourceModelLinkKey];
    //       if (referencedModel) {
    //         referencedModel[backlinkKey].delete(model);
    //       }
    //       return;
    //     }
    //     if (event.operation === "create") {
    //       const referencedModel = model[sourceModelLinkKey];
    //       if (referencedModel) {
    //         referencedModel[backlinkKey].add(model);
    //       }
    //       return;
    //     }
    //     const serializedForeignKey = model
    //       ? getModelMetadata(model.constructor).foreignKeys[link.key].serializedKey
    //       : null;
    //     if (event.operation === "update" && event.propKey === serializedForeignKey) {
    //       const oldReferencedModel = event.oldValue
    //         ? store.models[referencedModelName].get(event.oldValue)
    //         : null;
    //       const newReferencedModel = event.newValue
    //         ? store.models[referencedModelName].get(event.newValue)
    //         : null;
    //       if (oldReferencedModel && oldReferencedModel[backlinkSetKey].has(model)) {
    //         oldReferencedModel[backlinkSetKey].delete(model);
    //       }
    //       if (newReferencedModel && !newReferencedModel[backlinkSetKey].has(model)) {
    //         newReferencedModel[backlinkSetKey].add(model);
    //       }
    //     }
    //   }
    // });
    return function (this: any, initialValue: any) {
      if (!(initialValue instanceof Set)) {
        throw new Error("Backlinks must be initialized with a Set");
      }
      // TODO maybe confirm that there's a matching foreign key
      if (initialValue.size > 0) {
        console.warn("Backlinks should not be initialized with an existing set");
      }
      const metadata = getOrCreateModelMetadata(this);
      metadata.backlinks[backlinkKey] = { from: sourceModelName, key: sourceModelLinkKey };
      const set = observable.set(initialValue);
      // TODO: Maybe we should just override the add/delete methods on the set?
      const originalAdd = set.add;
      const originalDelete = set.delete;
      set.add = function (value: any) {
        const res = originalAdd.call(this, value);
        globalStore?.emitEvent({
          operation: "addToBacklinks",
          model: metadata.name,
          id: this.id,
          backlinkKey,
        });
        return res;
      };
      set.delete = function (value: any) {
        const res = originalDelete.call(this, value);
        globalStore?.emitEvent({
          operation: "deleteFromBacklinks",
          model: metadata.name,
          id: this.id,
          backlinkKey,
        });
        return res;
      };

      return set;
    };
  };
};

class Issue extends BaseModel {
  @property()
  accessor title = "";

  @link()
  accessor project: Project | null = null;

  @backlinks("relation.from")
  readonly relationsFrom = new Set<Relation>();

  @backlinks("relation.to")
  readonly relationsTo = new Set<Relation>();
}

class Project extends BaseModel {
  @property()
  accessor title = "";

  @backlinks("issue.project")
  readonly issues = new Set<Issue>();
}

class Relation extends BaseModel {
  @link({ modelName: "issue" })
  accessor from: Issue | null = null;

  @link({ modelName: "issue" })
  accessor to: Issue | null = null;
}

const store = createStore({
  issue: Issue,
  project: Project,
  relation: Relation,
});

// Load initial data
const issue1 = store.models.issue.create({ id: "i1", title: "Issue 1", projectId: "p1" });
const project1 = store.models.project.create({ id: "p1", title: "Project 1" });
const project2 = store.models.project.create({ id: "p2", title: "Project 2" });

// // Make changes
runInAction(() => {
  project1.title = "Updated Title";
  issue1.project = project2;
});

console.log(project1.issues);

runInAction(() => {
  issue1.project = null;
});

console.log(project1.issues);

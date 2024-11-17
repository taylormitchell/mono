import { action, observable, reaction } from "mobx";
import { Event, ModelName, SerializedIssue, SerializedProject, SerializedRelation } from "./types";
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

const Property = (_serializedKey?: string) => {
  return <T extends BaseModel>(target: any, context: ClassAccessorDecoratorContext) => {
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
        // TODO Maybe this gets injected in during registration with the store? and so does
        // nothing in cases where the class is instantiated outside a store context?
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
  return <T extends BaseModel>(target: any, context: ClassAccessorDecoratorContext) => {
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

const Backlinks = (link: { from: ModelName; key: string }) => {
  return (_: any, context: ClassFieldDecoratorContext) => {
    const backlinkSetKey = String(context.name);

    // When the referencing model is updated, update the backlink set on the referenced model.
    store.subscribe((event) => {
      if (event.model === link.from) {
        const model = store.models[link.from].get(event.id);
        if (!model) {
          console.warn(`Received event for unknown model ${link.from} with id ${event.id}`);
          return;
        }
        const referencedModel = model[link.key];
        if (!referencedModel) {
          // TODO: something to do here?
          return;
        }
        const backlinks = referencedModel[backlinkSetKey];
        if (event.operation === "delete") {
          backlinks.delete(model);
          return;
        }
        if (event.operation === "create") {
          backlinks.add(model);
          return;
        }
        const serializedForeignKey = model
          ? getModelMetadata(model.constructor).foreignKeys[link.key].serializedKey
          : null;
        if (event.operation === "update" && event.propKey === serializedForeignKey) {
          if (event.oldValue === referencedModel.id && backlinks.has(model)) {
            backlinks.delete(model);
          }
          if (event.newValue === referencedModel.id && !backlinks.has(model)) {
            backlinks.add(model);
          }
        }
      }
    });

    // When a model is added/removed from the backlink set, update the foreign key on the
    // referencing model to match.
    // TODO: Maybe do this by dispatching an event. That way the behaviour only gets strung
    // up once you've instantiated the store. (Probably another way to do this tbh though)
    class BacklinksSet extends Set<any> {
      constructor(private owner: BaseModel) {
        super();
      }

      add(value: any) {
        if (value[link.key] !== this.owner) {
          value[link.key] = this.owner;
        }
        return super.add(value);
      }

      delete(value: any) {
        if (value[link.key] === this.owner) {
          value[link.key] = null;
        }
        return super.delete(value);
      }
    }

    return function (this: any, initialValue: any) {
      if (!(initialValue instanceof Set)) {
        throw new Error("Backlinks must be initialized with a Set");
      }
      // TODO maybe confirm that there's a matching foreign key
      if (initialValue.size > 0) {
        console.warn("Backlinks should not be initialized with an existing set");
      }
      return new BacklinksSet(this);
    };
  };
};

const Model = (name: ModelName) => {
  return (cls: any) => {
    cls[modelMetadata] = {
      name,
      properties: {},
      foreignKeys: {},
    } satisfies ModelMetadata;
    const instances = new Map<string, any>();
    store.models[name] = {
      // TODO: Should somehow make it more obvious that this is creating a new instance
      // or if one already exists, updating the existing one. And maybe the event should
      // be different between the two.
      create: action("create", (props: any) => {
        const existing = props.id ? store.models[name].get(props.id) : undefined;
        const inst = existing ?? new cls();
        if (!existing) {
          instances.set(inst.id, inst);
          // If we created a new instance, the class constructor will have assigned a new
          // random id. If the user provided an id, we should use that instead.
          if (props.id) {
            inst.id = props.id;
          }
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

        // TODO: Maybe condition on existing/new
        store.emitEvent({ operation: "create", model: name, id: inst.id, props });
        return inst;
      }),
      delete: action("delete", (id: string) => {
        store.emitEvent({ operation: "delete", model: name, id });
        instances.delete(id);
      }),
      get: (id: string) => instances.get(id),
      getAll: () => Array.from(instances.values()),
    };
    return cls;
  };
};

// Models
// store.registerModel("issue", Issue, SerializedIssue);
// ^ this way you could runtime check if props are valid for the model

// meh I dunno. seems fine to have store, class, and names coupled. don't need to pretend like we don't know
// the name associated with a class or like the user of store can create arbitrary class models without modifying
// the store too.
//
// That or we make the store actually know nothing about the types of the models it holders, and then we create
// some wrapper function that asserts the types of the models at runtime.
// Like maybe the store doesn't even get exposed?
/**
 * // I bet there are some fancy type things to make this work:
 *
 * const store = createStore({
 *   issue: Issue,
 *   project: Project,
 *   relation: Relation,
 * })
 * // ^ probably just throw if they try to do this twice
 * // this can check a bunch of stuff at runtime too e.g. that backlinks match up with foreign keys,
 * // and vice versa.
 *
 * const issue = store.models.issue.create({ id: "i1", title: "Issue 1", projectId: "p1" });
 *
 */

@Model("issue") // TODO: Do we even need this? We're already typing class to name in the store types above
class Issue extends BaseModel {
  @Property()
  accessor title = "";

  // TODO: same here where model name can be provided, but we just assume the accessor name matches the model name if none is provided
  @ForeignKey("projectId", "project")
  accessor project: Project | null = null;

  // @Backlinks("relation.from") TODO: Maybe this? Can typescript check this?
  @Backlinks({ from: "relation", key: "from" })
  readonly relationsFrom = new Set<Relation>();

  @Backlinks({ from: "relation", key: "to" })
  readonly relationsTo = new Set<Relation>();
}

@Model("project")
class Project extends BaseModel {
  @Property()
  accessor title = "";

  @Backlinks({ from: "issue", key: "project" })
  readonly issues = new Set<Issue>();
}

@Model("relation")
class Relation extends BaseModel {
  // alternative apis
  // @ForeignKey("issue", { serializedKey: "fromId" }) // Maybe the serializedKey is optional here too, and if not provided, we do the "Id" suffix thing
  // @ForeignKey("issue") Or maybe just assume it? like you trust users to use a prop name which you can add "Id" to
  @ForeignKey("fromId", "issue")
  accessor from: Issue | null = null;

  @ForeignKey("toId", "issue")
  accessor to: Issue | null = null;
}

// Load initial data
const issue1 = store.models.issue.create({ id: "i1", title: "Issue 1", projectId: "p1" });
// const project1 = store.models.project.create({ id: "p1", title: "Project 1" });
// const project2 = store.models.project.create({ id: "p2", title: "Project 2" });

// // Make changes
// runInAction(() => {
//   project1.title = "Updated Title";
//   issue1.project = project2;
// });

// console.log(project1.issues);

// runInAction(() => {
//   issue1.project = null;
// });

// console.log(project1.issues);

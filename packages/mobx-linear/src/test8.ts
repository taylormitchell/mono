import { observable, reaction, runInAction } from "mobx";

type Event = any;
let events: Event[] = [];
const eventsDirty = observable.box(false);
function emitEvent(event: Event) {
  events.push(event);
  eventsDirty.set(true);
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}
type Subscriber = (event: Event) => void;
const subscribers = new Set<Subscriber>();

const foreignKeyRelations = new Map<
  string,
  {
    from: string;
    to: string;
    foreignKey: string;
  }
>();

function subscribe(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

reaction(
  () => eventsDirty.get(),
  () => {
    if (eventsDirty.get()) {
      console.log("Events:", events);
      events = [];
      eventsDirty.set(false);
    }
  }
);

/* eslint-disable @typescript-eslint/no-explicit-any */
const Property = (
  target: ClassAccessorDecoratorTarget<any, any>,
  context: ClassAccessorDecoratorContext
) => {
  const observableResult = observable(target, context);
  if (!observableResult) {
    throw new Error("Failed to apply observable decorator");
  }

  return {
    get() {
      return observableResult.get?.call(this);
    },
    set(newValue: unknown) {
      const oldValue = observableResult.get?.call(this);
      emitEvent({
        operation: "update",
        model: this.constructor.name.toLowerCase(),
        id: (this as any).id,
        oldProps: { [String(context.name)]: oldValue },
        newProps: { [String(context.name)]: newValue },
      });
      observableResult.set?.call(this, newValue);
    },
    init(value: unknown) {
      return observableResult.init?.call(this, value);
    },
  };
};

const ForeignKey = ({ name, to }: { name: string; to: string }) => {
  return (
    target: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
  ) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to apply observable decorator");
    }
    // const keyName = `${String(context.name)}Id`;
    const keyName = String(context.name);
    return {
      get() {
        return observableResult.get?.call(this);
      },
      set(newValue: Model | null) {
        const oldValue: Model | null = observableResult.get?.call(this);
        emitEvent({
          object: this,
          operation: "update",
          propKey: keyName,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: unknown) {
        if (!foreignKeyRelations.has(name)) {
          foreignKeyRelations.set(name, {
            from: this.constructor.name,
            to,
            foreignKey: keyName,
          });
        }
        return observableResult.init?.call(this, value);
      },
    };
  };
};

class Backlinks<T extends Model> {
  private set = new Set<T>();
  unsubscribe: (() => void) | null = null;

  constructor(private owner: Model, private foreignKeyRelation: string) {
    this.setupSubscription();
  }

  setupSubscription() {
    if (this.unsubscribe) {
      return;
    }
    const relation = foreignKeyRelations.get(this.foreignKeyRelation);
    if (relation) {
      this.unsubscribe = subscribe((event) => {
        if (
          event.object.model === relation.from &&
          event.operation === "update" &&
          event.propKey === relation.foreignKey
        ) {
          if (event.oldValue && event.oldValue === this.owner && this.set.has(event.object)) {
            this.set.delete(event.object);
          }
          if (event.newValue && event.newValue === this.owner && !this.set.has(event.object)) {
            this.set.add(event.object);
          }
        }
      });
    }
  }

  add(value: T): void {
    this.setupSubscription();
    if (!this.unsubscribe) {
      throw new Error("Trying to use backlinks without corresponding foreign key relation");
    }
    value[this.foreignKey] = this.owner;
  }

  remove(value: T): void {
    this.setupSubscription();
    if (!this.unsubscribe) {
      throw new Error("Trying to use backlinks without corresponding foreign key relation");
    }
    value[this.foreignKey] = null;
  }

  get size(): number {
    return this.set.size;
  }

  get ids(): string[] {
    return Array.from(this.set.values()).map((value) => value.id);
  }
}

interface Model {
  id: string;
  model: string;
}

class Issue implements Model {
  readonly model = "issue";

  constructor(readonly id: string) {}

  @Property
  accessor title = "";

  @ForeignKey({ name: "issue-to-project", to: "project" })
  accessor project: Project | null = null;
}

class Project implements Model {
  readonly model = "project";
  readonly id: string;

  @Property
  accessor title = "";

  issues: Backlinks<Issue>;

  constructor(id: string) {
    this.id = id;
    this.issues = new Backlinks(this, "issue-to-project");
  }

  destroy() {
    this.issues.unsubscribe?.();
  }
}

// Test code
const project1 = new Project("project1");
const issue1 = new Issue("issue1");

runInAction(() => {
  issue1.project = project1;
});
console.log("project1.issues.ids", project1.issues.ids);

runInAction(() => {
  project1.issues.remove(issue1);
});
console.log("issue1.project", issue1.project);

// runInAction(() => {
//   issue.title = "issue 1";
//   project.title = "project 1";
//   issue.project = project;
//   project.issues.delete("issue1");
// });
// console.log("after assigning then deleting");
// console.log("project.issues.size", project.issues.size);
// console.log("issue.project?.id", issue.project?.id);

// runInAction(() => {
//   issue.project = project2;
// });
// console.log("after assigning to another project");
// console.log("project2.issues.size", project2.issues.size);
// console.log("issue.project?.id", issue.project?.id);

import { observable, reaction, runInAction } from "mobx";

let events: any[] = [];
const eventsDirty = observable.box(false);
function emitEvent(event: any) {
  events.push(event);
  eventsDirty.set(true);
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

const ForeignKey = (collectionName: string) => {
  return (
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
          oldProps: { [`${String(context.name)}Id`]: oldValue?.id },
          newProps: { [`${String(context.name)}Id`]: newValue?.id },
        });

        // Handle two-way relationship
        if (oldValue) {
          (oldValue as any)[collectionName].delete((this as any).id);
        }
        if (newValue) {
          (newValue as any)[collectionName].set((this as any).id, this);
        }

        observableResult.set?.call(this, newValue);
      },
      init(value: unknown) {
        return observableResult.init?.call(this, value);
      },
    };
  };
};

class Collection<T> {
  private map = new Map<string, T>();

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  set(key: string, value: T): void {
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }
}

class Issue {
  readonly model = "issue";

  constructor(readonly id: string) {}

  @Property
  accessor title = "";

  @ForeignKey("issues")
  accessor project: Project | null = null;
}

class Project {
  readonly model = "project";
  issues = new Collection<Issue>();

  constructor(readonly id: string) {}

  @Property
  accessor title = "";
}

// Test code
const issue = new Issue("issue1");
const project = new Project("project1");
const project2 = new Project("project2");

runInAction(() => {
  issue.title = "issue 1";
  project.title = "project 1";
  issue.project = project;
  project.issues.delete("issue1");
});
console.log("after assigning then deleting");
console.log("project.issues.size", project.issues.size);
console.log("issue.project?.id", issue.project?.id);

runInAction(() => {
  issue.project = project2;
});
console.log("after assigning to another project");
console.log("project2.issues.size", project2.issues.size);
console.log("issue.project?.id", issue.project?.id);

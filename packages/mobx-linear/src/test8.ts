import { observable, reaction } from "mobx";

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
  // First apply the observable decorator
  const observableResult = observable(target, context);
  if (!observableResult) {
    throw new Error("Failed to apply observable decorator");
  }

  // Then wrap it with our logging functionality
  return {
    get() {
      const value = observableResult.get?.call(this);
      return value;
    },
    set(newValue: unknown) {
      const oldValue = observableResult.get?.call(this);
      emitEvent({ type: "set", name: String(context.name), oldValue, newValue });
      observableResult.set?.call(this, newValue);
    },
    init(value: unknown) {
      return observableResult.init?.call(this, value);
    },
  };
};

class Test {
  @Property
  accessor title = "test";

  @Property
  accessor createdAt = new Date();
}

const test = new Test();

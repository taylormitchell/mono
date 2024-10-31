import { autorun, observable, runInAction } from "mobx";

const ObservableWithLogs = (target: any, context: ClassAccessorDecoratorContext) => {
  // First apply the observable decorator
  const observableResult = observable(target, context);
  if (!observableResult) {
    throw new Error("Failed to apply observable decorator");
  }

  // Then wrap it with our logging functionality
  return {
    get() {
      const value = observableResult.get?.call(this);
      console.log(`Getting ${String(context.name)}:`, value);
      return value;
    },
    set(newValue: any) {
      const oldValue = observableResult.get?.call(this);
      console.log(`Setting ${String(context.name)} from:`, oldValue, "to:", newValue);
      observableResult.set?.call(this, newValue);
    },
    init(value: any) {
      console.log(`Initializing ${String(context.name)}`, { this: this, context });
      return observableResult.init?.call(this, value);
    },
  };
};

class Test {
  @ObservableWithLogs accessor title = "test";
}

const test = new Test();
// makeAutoObservable(test);

autorun(() => {
  console.log(test.title);
});

runInAction(() => {
  test.title = "test2";
});

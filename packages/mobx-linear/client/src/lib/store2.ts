const store = createStore({
  models: {
    issue: Issue,
    project: Project,
  },
  onEvent: (event) => {
    if (event.propertyName !== "updatedAt") {
      const obj = store.get(event.model, event.id);
      if (!obj) return;
      obj.updatedAt = Date.now();
    }
  },
});

import { makeObservable, observable, autorun } from "mobx";
import { createStore } from "./models";

// const issue = store.create("issue", { title: "Test issue" });
// const issue = store.models.issue.create({ title: "Test issue" });

// const issue = store.get("issue", "123");
// const issue = store.models.issue.get("123");

function Property() {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    return {
      get: () => {
        return "original";
      },
      set: (value: string) => {
        console.log("set", value);
      },
    };
  };
}

class Test {
  @Property()
  accessor title: string = "original";
}

const test = new Test();

makeObservable(test, {
  title: observable,
});

autorun(() => {
  console.log(test.title);
});

test.title = "Test";

import { autorun, observable, runInAction } from "mobx";

const values = observable.array([]);

autorun(() => {
  console.log(values.slice());
});

runInAction(() => {
  values.push(1);
  values.push(2);
});

import { makeAutoObservable } from "mobx";

class Test {
  name = "test";
  constructor() {
    makeAutoObservable(this);
  }
}

const test = new Test();
test.name = "test2";

import { makeAutoObservable } from "mobx";

type Issue = {
  readonly model: "issue";
  readonly id: string;
  title: string;
};

const issue: Issue = {
  model: "issue",
  id: "1",
  title: "test",
};

makeAutoObservable(issue);

console.log(issue.title);

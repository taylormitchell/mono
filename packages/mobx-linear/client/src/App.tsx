import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import { createStore, StoreContext } from "./lib/models";
import issues from "./data/all-react-issues-simple.json";

const store = createStore();
// store.create("issue", { title: "a1", createdAt: 3 });
// store.create("issue", { title: "a2", createdAt: 2 });
// store.create("issue", { title: "b1", createdAt: 1 });
issues.forEach((issue) =>
  store.create("issue", {
    title: issue.title,
    createdAt: new Date(issue.created_at).getTime(),
    user: issue.user,
    labels: issue.labels.map((label) => store.create("label", { id: label, name: label })),
    state: issue.state,
    body: issue.body,
  })
);

const App = observer(() => {
  return (
    <StoreContext.Provider value={store}>
      <IssueList />
    </StoreContext.Provider>
  );
});

export default App;

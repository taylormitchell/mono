import { createStore } from "./lib/models";
import { observer } from "mobx-react-lite";

const store = createStore();
store.pull();
(window as any).store = store;

const App = observer(() => {
  return (
    <div>
      <div style={{ margin: "10px 0" }}>
        <button onClick={() => store.push()}>Push Changes</button>
        <button onClick={() => store.pull()}>Pull Changes</button>
      </div>
      <Issues />
    </div>
  );
});

const Issues = observer(function Issues() {
  const issues = store.getAll("issue");

  return (
    <div>
      <button
        onClick={() => {
          store.create("issue", { title: "New Issue" });
        }}
      >
        Create New Issue
      </button>

      {issues
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((issue) => (
          <div key={issue.id} style={{ margin: "10px 0" }}>
            <input value={issue.title} onChange={(e) => (issue.title = e.target.value)} />
            <button onClick={() => store.delete(issue)}>Delete</button>
          </div>
        ))}
    </div>
  );
});

export default App;

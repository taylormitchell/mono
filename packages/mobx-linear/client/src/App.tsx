import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import styles from "./App.module.css";
import { createStore, StoreContext } from "./lib/models";
import issues from "../public/react-issues.json";

const store = createStore();
// store.create("issue", { title: "a1", createdAt: 3 });
// store.create("issue", { title: "a2", createdAt: 2 });
// store.create("issue", { title: "b1", createdAt: 1 });
issues.forEach((issue) => store.create("issue", issue));

const App = observer(() => {
  return (
    <StoreContext.Provider value={store}>
      <div className={styles.container}>
        <IssueList />
      </div>
    </StoreContext.Provider>
  );
});

export default App;

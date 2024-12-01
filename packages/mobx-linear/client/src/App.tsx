import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import styles from "./App.module.css";
import { createStore, StoreContext } from "./lib/models";

const store = createStore();
store.create("issue", { title: "1", createdAt: 1 });
store.create("issue", { title: "2", createdAt: 2 });
store.create("issue", { title: "3", createdAt: 3 });

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

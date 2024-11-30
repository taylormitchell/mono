import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import { StoreContext } from "./lib/StoreContext";
import styles from "./App.module.css";
import { createStore } from "./lib/models";

const store = createStore();

const App = observer(() => {
  return (
    <StoreContext.Provider value={store}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => store.push()}>Push Changes</button>
          <button onClick={() => store.pull()}>Pull Changes</button>
        </div>
        <IssueList />
      </div>
    </StoreContext.Provider>
  );
});

export default App;

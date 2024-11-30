import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import styles from "./App.module.css";
import { createStore, StoreContext } from "./lib/models";

const store = createStore();

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

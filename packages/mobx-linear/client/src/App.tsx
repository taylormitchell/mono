import { observer } from "mobx-react-lite";
import { IssueList } from "./components/IssueList";
import { StoreProvider } from "./lib/StoreContext";
import styles from "./App.module.css";
import { Store } from "./lib/store";

const store = new Store();

const AppContent = observer(() => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => store.push()}>Push Changes</button>
        <button onClick={() => store.pull()}>Pull Changes</button>
      </div>
      <IssueList />
    </div>
  );
});

const App = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;

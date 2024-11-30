import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState, useEffect, useMemo } from "react";
import { IssueType } from "../lib/models";
import { debounce } from "remeda";

export const IssueList = observer(() => {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const issues = store
    .getAll("issue")
    .filter(
      (issue) => !searchQuery || issue.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Issues</h2>
          <span className={styles.issueCount}>{issues.length}</span>
        </div>
        <button
          className={styles.createButton}
          onClick={() => store.create("issue", { title: "New Issue" })}
        >
          New Issue
        </button>
      </div>
      <FilterBar onSearch={setSearchQuery} />

      <div className={styles.list}>
        {issues
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
      </div>
    </div>
  );
});

const IssueRow = observer(({ issue }: { issue: IssueType }) => {
  const store = useStore();
  const [localTitle, setLocalTitle] = useState(issue.title);

  // Update local title when issue.title changes externally
  useEffect(() => {
    setLocalTitle(issue.title);
  }, [issue.title]);

  // Debounced update function
  const updateTitle = useMemo(
    () =>
      debounce(
        (newTitle: string) => {
          issue.title = newTitle;
        },
        { maxWaitMs: 2000 }
      ),
    [issue]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    updateTitle.call(newTitle);
  };

  return (
    <div className={styles.issueRow}>
      <div className={styles.issueStatus}>●</div>
      <input className={styles.issueTitle} value={localTitle} onChange={handleTitleChange} />
      <div className={styles.issueMetadata}>
        <span className={styles.priority}>P1</span>
        <span className={styles.label}>Bug</span>
        <span className={styles.status}>In Progress</span>
      </div>
      <button className={styles.deleteButton} onClick={() => store.delete(issue)}>
        Delete
      </button>
    </div>
  );
});

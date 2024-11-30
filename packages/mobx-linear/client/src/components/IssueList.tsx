import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState } from "react";

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
            <div key={issue.id} className={styles.issueRow}>
              <div className={styles.issueStatus}>●</div>
              <input
                className={styles.issueTitle}
                value={issue.title}
                onChange={(e) => (issue.title = e.target.value)}
              />
              <div className={styles.issueMetadata}>
                <span className={styles.priority}>P1</span>
                <span className={styles.label}>Bug</span>
                <span className={styles.status}>In Progress</span>
              </div>
              <button className={styles.deleteButton} onClick={() => store.delete(issue)}>
                Delete
              </button>
            </div>
          ))}
      </div>
    </div>
  );
});

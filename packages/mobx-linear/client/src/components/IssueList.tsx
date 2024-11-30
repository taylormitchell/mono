import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState } from "react";
import { IssueType } from "../lib/models";
import { CreateIssueModal } from "./CreateIssueModal";

export const IssueList = observer(() => {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
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

      {isCreateModalOpen && <CreateIssueModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
});

const IssueRow = observer(({ issue }: { issue: IssueType }) => {
  const store = useStore();

  return (
    <div className={styles.issueRow}>
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
  );
});

import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState } from "react";
import { IssueType } from "../lib/models";
import { CreateIssueModal } from "./CreateIssueModal";
import { EditIssueModal } from "./EditIssueModal";

const useAllIssuesView = () => {
  const store = useStore();
  let view = store.get("issueView", "all");
  if (!view) {
    view = store.create("issueView", { id: "all" });
  }
  return view;
};

export const IssueList = observer(() => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const allIssuesView = useAllIssuesView();

  const issuesWithPositions = allIssuesView
    .getIssues()
    .filter(
      ({ issue }) => !searchQuery || issue.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Issues</h2>
          <span className={styles.issueCount}>{issuesWithPositions.length}</span>
        </div>
        <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
          New Issue
        </button>
      </div>
      <FilterBar onSearch={setSearchQuery} />

      <div className={styles.list}>
        {issuesWithPositions
          .sort((a, b) => a.position.localeCompare(b.position))
          .map(({ issue, position }) => (
            <div key={issue.id}>
              <IssueRow issue={issue} />
              <div>{position}</div>
            </div>
          ))}
      </div>

      {isCreateModalOpen && <CreateIssueModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
});

const IssueRow = observer(({ issue }: { issue: IssueType }) => {
  const store = useStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <div className={styles.issueRow} onClick={() => setIsEditModalOpen(true)}>
        <div className={styles.issueStatus}>●</div>
        <div className={styles.issueTitle}>{issue.title}</div>
        <div className={styles.issueMetadata}>
          <span className={styles.priority}>P1</span>
          <span className={styles.label}>Bug</span>
          <span className={styles.status}>In Progress</span>
        </div>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            store.delete(issue);
          }}
        >
          Delete
        </button>
      </div>

      {isEditModalOpen && (
        <EditIssueModal issue={issue} onClose={() => setIsEditModalOpen(false)} />
      )}
    </>
  );
});

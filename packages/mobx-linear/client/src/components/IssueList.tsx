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
          .map(({ issue, position }, index) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              position={position}
              index={index}
              totalItems={issuesWithPositions.length}
              issuesWithPositions={issuesWithPositions}
              allIssuesView={allIssuesView}
            />
          ))}
      </div>

      {isCreateModalOpen && <CreateIssueModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
});

const IssueRow = observer(
  ({
    issue,
    position,
    index,
    totalItems,
    issuesWithPositions,
    allIssuesView,
  }: {
    issue: IssueType;
    position: string;
    index: number;
    totalItems: number;
    issuesWithPositions: Array<{ issue: IssueType; position: string }>;
    allIssuesView: any;
  }) => {
    const store = useStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    return (
      <>
        <div className={styles.issueRow} onClick={() => setIsEditModalOpen(true)}>
          <div className={styles.moveButtons}>
            <button
              className={styles.moveButton}
              onClick={(e) => {
                e.stopPropagation();
                if (index > 0) {
                  const before = index > 1 ? issuesWithPositions[index - 2].issue : null;
                  const after = issuesWithPositions[index - 1].issue;
                  allIssuesView.placeBetween(issue, before, after);
                }
              }}
            >
              ↑
            </button>
            <button
              className={styles.moveButton}
              onClick={(e) => {
                e.stopPropagation();
                if (index < totalItems - 1) {
                  const before = issuesWithPositions[index + 1].issue;
                  const after =
                    index < totalItems - 2 ? issuesWithPositions[index + 2].issue : null;
                  allIssuesView.placeBetween(issue, before, after);
                }
              }}
            >
              ↓
            </button>
          </div>
          <div className={styles.issueStatus}>●</div>
          <div className={styles.issueTitle}>{issue.title}</div>
          <div className={styles.issueMetadata}>
            <span className={styles.priority}>P1</span>
            <span className={styles.label}>Bug</span>
            <span className={styles.status}>In Progress</span>
          </div>
          <div>{position}</div>
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
  }
);

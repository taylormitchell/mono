import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState } from "react";
import { IssueType } from "../lib/models";
import { CreateIssueModal } from "./CreateIssueModal";
import { EditIssueModal } from "./EditIssueModal";
import { createPosition, getNewPositionsForMove } from "../lib/position";
import { useKeyDown } from "./useKeyDown";

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

  useKeyDown("c", (e) => {
    e.preventDefault();
    setIsCreateModalOpen(true);
  });

  const issues = allIssuesView.issues
    .filter(
      (issue) => !searchQuery || issue.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((issue) => ({
      issue,
      position:
        allIssuesView.issueViewPositionsById[issue.id]?.position ?? createPosition(issue.createdAt),
    }))
    .sort((a, b) => (a.position > b.position ? 1 : -1));

  const handleMoveUp = (index: number) => {
    const moveAfterIndex = index - 2;
    const rePositions = getNewPositionsForMove(issues, (i) => i.position, index, moveAfterIndex);
    if (rePositions.size === 0) return;
    rePositions.forEach((position, item) => {
      allIssuesView.upsertPosition(item.issue, position);
    });
    // If the item we're moving after doesn't have a persisted position, persist it
    const itemMovedAfter = issues[moveAfterIndex];
    if (itemMovedAfter && !allIssuesView.issueViewPositionsById[itemMovedAfter.issue.id]) {
      allIssuesView.upsertPosition(itemMovedAfter.issue, itemMovedAfter.position);
    }
  };

  const handleMoveDown = (index: number) => {
    const moveAfterIndex = index + 1;
    const rePositions = getNewPositionsForMove(issues, (i) => i.position, index, moveAfterIndex);
    if (rePositions.size === 0) return;
    rePositions.forEach((position, item) => {
      allIssuesView.upsertPosition(item.issue, position);
    });
    // If the item we're moving after doesn't have a persisted position, persist it
    const itemMovedAfter = issues[moveAfterIndex];
    if (itemMovedAfter && !allIssuesView.issueViewPositionsById[itemMovedAfter.issue.id]) {
      allIssuesView.upsertPosition(itemMovedAfter.issue, itemMovedAfter.position);
    }
  };

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
        {issues.map(({ issue, position }, index) => (
          <div key={issue.id}>
            <div key={issue.id}>
              <IssueRow
                issue={issue}
                position={position}
                moveUpHandler={() => handleMoveUp(index)}
                moveDownHandler={() => handleMoveDown(index)}
              />
            </div>
          </div>
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
    moveUpHandler,
    moveDownHandler,
  }: {
    issue: IssueType;
    position: string;
    moveUpHandler: () => void;
    moveDownHandler: () => void;
  }) => {
    const store = useStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    return (
      <>
        <div className={styles.issueRow} onClick={() => setIsEditModalOpen(true)}>
          <div className={styles.issueStatus}>●</div>
          <div className={styles.issueTitle}>{issue.title}</div>
          <div>{position}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveUpHandler();
            }}
          >
            ↑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveDownHandler();
            }}
          >
            ↓
          </button>
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

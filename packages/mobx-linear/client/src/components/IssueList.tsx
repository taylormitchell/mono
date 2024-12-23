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
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

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
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; issueId: string } | null>(
    null
  );
  const allIssuesView = useAllIssuesView();

  useKeyDown("c", (e) => {
    e.preventDefault();
    setModal({ type: "create" });
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

  const ROW_HEIGHT = 70; // Adjust based on your actual row height

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Issues</h2>
          <span className={styles.issueCount}>{issues.length}</span>
        </div>
        <button className={styles.createButton} onClick={() => setModal({ type: "create" })}>
          New Issue
        </button>
      </div>
      <FilterBar onSearch={setSearchQuery} />

      <div className={styles.list}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={issues.length}
              itemSize={ROW_HEIGHT}
              itemData={{
                issues,
                handleMoveUp,
                handleMoveDown,
              }}
            >
              {({ index, style, data }: any) => {
                const { issue, position } = data.issues[index];
                return (
                  <div style={style}>
                    <IssueRow
                      issue={issue}
                      position={position}
                      moveUpHandler={() => data.handleMoveUp(index)}
                      moveDownHandler={() => data.handleMoveDown(index)}
                      setIsEditModalOpen={() => setModal({ type: "edit", issueId: issue.id })}
                    />
                  </div>
                );
              }}
            </List>
          )}
        </AutoSizer>
      </div>
      {modal?.type === "edit" && (
        <EditIssueModal issueId={modal.issueId} onClose={() => setModal(null)} />
      )}
      {modal?.type === "create" && <CreateIssueModal onClose={() => setModal(null)} />}
    </div>
  );
});

const IssueRow = observer(
  ({
    issue,
    position,
    moveUpHandler,
    moveDownHandler,
    setIsEditModalOpen,
  }: {
    issue: IssueType;
    position: string;
    moveUpHandler: () => void;
    moveDownHandler: () => void;
    setIsEditModalOpen: (open: boolean) => void;
  }) => {
    const store = useStore();
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
      </>
    );
  }
);

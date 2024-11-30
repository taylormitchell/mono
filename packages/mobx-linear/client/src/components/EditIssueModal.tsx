import { observer } from "mobx-react-lite";
import { useState } from "react";
import { IssueType } from "../lib/models";
import styles from "./CreateIssueModal.module.css"; // Reuse the same styles
import { CloseIcon } from "./Icons";

interface EditIssueModalProps {
  issue: IssueType;
  onClose: () => void;
}

export const EditIssueModal = observer(({ issue, onClose }: EditIssueModalProps) => {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    issue.title = title.trim();
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Edit Issue</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            <div className={styles.field}>
              <input
                type="text"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.titleInput}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <textarea
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.descriptionInput}
                rows={4}
              />
            </div>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.createButton} disabled={!title.trim()}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </>
  );
});

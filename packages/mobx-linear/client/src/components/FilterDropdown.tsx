import { observer } from "mobx-react-lite";
import styles from "./FilterDropdown.module.css";
import { useState } from "react";

interface FilterOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  values?: string[];
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: "status", label: "Status", icon: <StatusIcon />, values: ["To do", "In Progress", "Done"] },
  { id: "priority", label: "Priority", icon: <PriorityIcon />, values: ["P0", "P1", "P2", "P3"] },
  { id: "assignee", label: "Assignee", icon: <AssigneeIcon />, values: ["Me", "Unassigned"] },
  {
    id: "labels",
    label: "Labels",
    icon: <LabelIcon />,
    values: ["Bug", "Feature", "Documentation"],
  },
];

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterDropdown = observer(({ isOpen, onClose }: FilterDropdownProps) => {
  const [selectedProperty, setSelectedProperty] = useState<FilterOption | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, Set<string>>>({});

  if (!isOpen) return null;

  const handlePropertyClick = (option: FilterOption) => {
    setSelectedProperty(option);
  };

  const handleValueClick = (value: string) => {
    if (!selectedProperty) return;

    const propertyId = selectedProperty.id;
    const currentValues = selectedValues[propertyId] || new Set();

    const newValues = new Set(currentValues);
    if (newValues.has(value)) {
      newValues.delete(value);
    } else {
      newValues.add(value);
    }

    setSelectedValues({ ...selectedValues, [propertyId]: newValues });
  };

  const handleBackClick = () => {
    setSelectedProperty(null);
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dropdown}>
        {!selectedProperty ? (
          <>
            <div className={styles.header}>Filter</div>
            <div className={styles.options}>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={styles.optionButton}
                  onClick={() => handlePropertyClick(option)}
                >
                  <span className={styles.icon}>{option.icon}</span>
                  {option.label}
                  <ChevronIcon />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <button className={styles.backButton} onClick={handleBackClick}>
                <BackIcon />
              </button>
              {selectedProperty.label}
            </div>
            <div className={styles.values}>
              {selectedProperty.values?.map((value) => (
                <button
                  key={value}
                  className={`${styles.valueButton} ${
                    selectedValues[selectedProperty.id]?.has(value) ? styles.selected : ""
                  }`}
                  onClick={() => handleValueClick(value)}
                >
                  <CheckIcon />
                  {value}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
});

const StatusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const PriorityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const AssigneeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const LabelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4a2 2 0 012-2h4l6 6-6 6-6-6V4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

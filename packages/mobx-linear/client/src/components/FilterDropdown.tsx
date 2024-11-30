import { observer } from "mobx-react-lite";
import styles from "./FilterDropdown.module.css";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { StatusIcon, PriorityIcon, AssigneeIcon, LabelIcon, ChevronIcon, BackIcon } from "./Icons";

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

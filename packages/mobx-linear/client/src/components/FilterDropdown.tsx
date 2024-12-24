import { observer } from "mobx-react-lite";
import styles from "./FilterDropdown.module.css";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { StatusIcon, PriorityIcon, AssigneeIcon, LabelIcon, ChevronIcon, BackIcon } from "./Icons";
import { useStore } from "../lib/useStore";

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
  },
];

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterDropdown = observer(({ isOpen, onClose }: FilterDropdownProps) => {
  const store = useStore();
  const [options, setOptions] = useState<
    | {
        type: "property";
        properties: FilterOption[];
      }
    | {
        type: "value";
        propertyId: FilterOption["id"];
        values: { id: string; name: string }[];
      }
  >({ type: "property", properties: FILTER_OPTIONS });

  if (!isOpen) return null;

  const handlePropertyClick = (option: FilterOption) => {
    if (option.id === "labels") {
      const labels = store.getAll("label");
      setOptions({ type: "value", propertyId: option.id, values: labels });
    } else {
      setOptions({
        type: "value",
        propertyId: option.id,
        values: option.values?.map((value) => ({ id: value, name: value })) || [],
      });
    }
  };

  const handleValueClick = (value: string) => {
    if (options.type !== "value") return;
    setOptions({
      type: "property",
      properties: FILTER_OPTIONS,
    });

    // const propertyId = options.propertyId;
    // const currentValues = options.values || new Set();

    // const newValues = new Set(currentValues);
    // if (newValues.has(value)) {
    //   newValues.delete(value);
    // } else {
    //   newValues.add(value);
    // }

    // setOptions({ ...options, values: newValues });
  };

  const handleBackClick = () => {
    setOptions({ type: "property", properties: FILTER_OPTIONS });
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

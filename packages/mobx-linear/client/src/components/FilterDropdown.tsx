import { observer } from "mobx-react-lite";
import styles from "./FilterDropdown.module.css";
import { useState } from "react";
import {
  StatusIcon,
  PriorityIcon,
  AssigneeIcon,
  LabelIcon,
  ChevronIcon,
  BackIcon,
  CheckIcon,
} from "./Icons";
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
        values: { id: string; propertyId: string; name: string }[];
      }
  >({ type: "property", properties: FILTER_OPTIONS });
  const [selectedValues, setSelectedValues] = useState<
    {
      property: FilterOption;
      value: { id: string; propertyId: string; name: string };
    }[]
  >([]);

  const handlePropertyClick = (option: FilterOption) => {
    if (option.id === "labels") {
      const labels = store.getAll("label").map((label) => ({
        id: label.id,
        propertyId: option.id,
        name: label.name,
      }));
      setOptions({ type: "value", propertyId: option.id, values: labels });
    } else {
      setOptions({
        type: "value",
        propertyId: option.id,
        values:
          option.values?.map((value) => ({ id: value, propertyId: option.id, name: value })) || [],
      });
    }
  };

  const handleValueClick = (value: { id: string; propertyId: string; name: string }) => {
    const property = FILTER_OPTIONS.find((p) => p.id === value.propertyId);
    if (!property) return;
    setSelectedValues((prev) => {
      const newValues = [...prev];
      const index = newValues.findIndex((sv) => sv.value.id === value.id);
      if (index === -1) {
        newValues.push({ property, value });
      } else {
        newValues.splice(index, 1);
      }
      return newValues;
    });
  };

  const handleBackClick = () => {
    setOptions({ type: "property", properties: FILTER_OPTIONS });
  };

  console.log(selectedValues);
  return (
    <>
      {selectedValues.length > 0 && (
        <div className={styles.selectedValues}>
          {selectedValues.map((sv) => (
            <div key={sv.value.id}>
              {sv.property.label}: {sv.value.name}
            </div>
          ))}
        </div>
      )}
      {isOpen && (
        <>
          <div className={styles.overlay} onClick={onClose} />
          <div className={styles.dropdown}>
            {options.type === "property" ? (
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
                  {options.propertyId}
                </div>
                <div className={styles.values}>
                  {options.values?.map((value) => (
                    <button
                      key={value.id}
                      className={`${styles.valueButton} ${
                        selectedValues.some((sv) => sv.value.id === value.id) ? styles.selected : ""
                      }`}
                      onClick={() => handleValueClick(value)}
                    >
                      <CheckIcon />
                      {value.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
});

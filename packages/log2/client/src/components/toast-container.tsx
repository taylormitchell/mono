import React from "react";
import { useToast, Toast } from "./toast";

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const typeClasses = {
    error: "border-red-500",
    info: "border-blue-500",
  }[toast.type];

  return (
    <div
      className={`bg-primary border-secondary text-primary rounded shadow-md px-4 py-3 min-w-[250px] max-w-[350px] 
        flex justify-between items-center transition-opacity duration-300 border-b-2 ${typeClasses}`}
    >
      <div>{toast.message}</div>
      <button
        onClick={onClose}
        className="bg-transparent border-none text-primary text-xl cursor-pointer ml-2"
        aria-label="Close toast"
      >
        &times;
      </button>
    </div>
  );
};

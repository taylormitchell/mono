import { atom, getDefaultStore, SetStateAction, useAtomValue } from "jotai";

// Types
type ToastType = "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Create a Jotai atom for storing toasts
const toastsAtom = atom<Toast[]>([]);

const setToasts = (toasts: SetStateAction<Toast[]>) => {
  getDefaultStore().set(toastsAtom, toasts);
};

const removeToast = (id: string) => {
  getDefaultStore().set(toastsAtom, (prevToasts) => prevToasts.filter((toast) => toast.id !== id));
};

const addToast = (message: string, type: ToastType, duration = 5000) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { id, message, type, duration };
  setToasts((prevToasts) => [...prevToasts, newToast]);
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

export const useToast = () => {
  const toasts = useAtomValue(toastsAtom);
  return { toasts, addToast, removeToast };
};

// Utility functions
export const toast = {
  error: (message: string, duration?: number) => {
    addToast(message, "error", duration);
  },
  info: (message: string, duration?: number) => {
    addToast(message, "info", duration);
  },
};

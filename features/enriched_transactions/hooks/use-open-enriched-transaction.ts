import { create } from "zustand";

type OpenEnrichedTransactionState = {
  id?: string;
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
};

export const useOpenEnrichedTransaction = create<OpenEnrichedTransactionState>(
  (set) => ({
    id: undefined,
    isOpen: false,
    onOpen: (id: string) => set({ isOpen: true, id }),
    onClose: () => set({ isOpen: false, id: undefined }),
  })
);

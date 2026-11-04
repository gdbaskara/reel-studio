import { useCallback, useEffect, useState } from "react";
import type { SavedStyle } from "../../shared/savedStyle";
import { api } from "./api";

export type SavedStyles = {
  readonly styles: readonly SavedStyle[];
  readonly refresh: () => Promise<void>;
  readonly remove: (styleId: string) => Promise<void>;
};

// The looks the user saved, shared by every reel. A failed load shows none rather than an error.
export const useSavedStyles = (): SavedStyles => {
  const [styles, setStyles] = useState<readonly SavedStyle[]>([]);
  const refresh = useCallback(async () => {
    setStyles(await api.styles().catch(() => []));
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const remove = useCallback(async (styleId: string) => {
    setStyles(await api.deleteStyle(styleId));
  }, []);
  return { styles, refresh, remove };
};

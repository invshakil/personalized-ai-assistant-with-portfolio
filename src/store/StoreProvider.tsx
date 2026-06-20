"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

/**
 * Wraps the admin surface in the Redux store. The store is created once per
 * mount via a lazy initializer (stable across re-renders, never shared between
 * requests). Mounted in `AdminShell` (the admin layout), which does not remount
 * on navigation, so chat state in the store persists across page switches.
 */
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}

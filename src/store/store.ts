import { configureStore } from "@reduxjs/toolkit";
import { aiChatReducer } from "./slices/aiChatSlice";

/**
 * Admin-surface Redux store. Holds transient client state that should outlive a
 * single page mount (currently the AI Assistant chat thread). It is created per
 * provider mount via `makeStore`, so there is no module-level singleton shared
 * across requests on the server.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      aiChat: aiChatReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

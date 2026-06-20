import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

/** Typed `useDispatch` — use instead of the bare hook so thunks/actions type-check. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
/** Typed `useSelector` — selector state is inferred as `RootState`. */
export const useAppSelector = useSelector.withTypes<RootState>();

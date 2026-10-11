"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** The browser's real path. The 404 page is prerendered, so the server can't know it. */
export default function CurrentPath() {
  return <>{useSyncExternalStore(noop, () => location.pathname, () => "/unknown")}</>;
}

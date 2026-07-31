"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useAuthStore } from "./auth-store";

// Re-export the store directly — this provider ensures the store is
// available in server-component trees via context if needed in future.
export { useAuthStore };

export type { SessionUser } from "./auth-store";

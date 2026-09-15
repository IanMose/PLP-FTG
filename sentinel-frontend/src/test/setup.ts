// @ts-nocheck — this file is only used by Vitest (not Next.js) and uses
// Vitest globals (beforeAll, afterEach, afterAll) injected at test runtime.
import "@testing-library/jest-dom";
/// <reference types="vitest/globals" />
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

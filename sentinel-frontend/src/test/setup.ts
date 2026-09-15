import "@testing-library/jest-dom";
// Vitest globals (beforeAll, afterEach, afterAll) are injected at runtime
// via vitest.config.ts globals:true — the type reference below ensures
// Biome and TypeScript both see them without a plugin.
/// <reference types="vitest/globals" />
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

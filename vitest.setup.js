import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * The test files under hooks/__tests__ and lib/__tests__ predate any test
 * runner in this repo and were written against Jest's globals. Aliasing `jest`
 * to `vi` lets them run unmodified rather than rewriting tests we did not write
 * while introducing the runner that first executes them.
 *
 * New tests should use `vi` directly.
 */
globalThis.jest = vi;

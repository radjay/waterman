import { defineConfig } from "vitest/config";
import { transform } from "esbuild";

/**
 * This repo writes React components as `.js`, not `.jsx`. Next/Turbopack does
 * not care, but Vitest's SSR transform parses with rollup and chokes on JSX in
 * a `.js` file. @vitejs/plugin-react would fix it but currently conflicts on
 * vite@7 peers, so run the JSX through the esbuild Vite already ships.
 *
 * Scoped to our own source directories so node_modules is untouched.
 */
const jsxInJs = () => ({
  name: "waterman:jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    if (!/\/(app|components|hooks|lib)\/.*\.js$/.test(id)) return null;
    if (!/<[A-Za-z/>]/.test(code)) return null; // cheap skip for plain modules
    const result = await transform(code, {
      loader: "jsx",
      jsx: "automatic",
      sourcefile: id,
      sourcemap: true,
    });
    return { code: result.code, map: result.map };
  },
});

export default defineConfig({
  plugins: [jsxInJs()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    include: ["**/__tests__/**/*.test.{js,jsx}"],
    exclude: ["node_modules/**", ".next/**", ".ds-sync/**", ".design-sync/**"],
  },
});

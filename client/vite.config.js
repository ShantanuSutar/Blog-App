import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8800",
    },
  },

  plugins: [viteCommonjs(), react(), resolve()],
  build: {
    rollupOptions: {},
  },
});

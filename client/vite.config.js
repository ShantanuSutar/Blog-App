import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default defineConfig({
  server: {
    proxy: {
      "/api": "https://api-kappa-snowy-88.vercel.app/",
    },
  },

  plugins: [viteCommonjs(), react(), resolve()],
  build: {
    rollupOptions: {
      external: ["axios"],
    },
  },
});

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === "production" ? "/project-n4mmon-dashboard/" : "/",
  server: {
    port: 5174,
    strictPort: true,
  },
});

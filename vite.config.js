import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/ashgen/", // Replace with your actual repo name
  plugins: [svelte()],
});

import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: ".",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AI Image Generator",
    description: "Analyze page images and generate new ones from selected text",
    version: "2.0.0",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    externally_connectable: {
      matches: ["http://localhost:3000/*"],
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

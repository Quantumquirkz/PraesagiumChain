/** @type {import('postcss-load-config').Config} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    tailwindcss: {
      config: path.resolve(__dirname, "tailwind.config.ts"),
    },
  },
};

export default config;

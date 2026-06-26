import { execSync } from "child_process";
import { existsSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiPath = join(root, "src", "app", "api");
const backupPath = join(root, ".api-bak");

console.log("Firebase Static Build");
console.log("=".repeat(40));

// Move API routes out (they live on Render, not Firebase)
if (existsSync(apiPath)) {
  renameSync(apiPath, backupPath);
  console.log("[1/3] Moved API routes aside");
}

try {
  console.log("[2/3] Building static export...");
  execSync("npx next build", {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      STATIC_BUILD: "1",
      NEXT_PUBLIC_API_URL: "https://employee-panel-clicktake.onrender.com",
    },
  });
  console.log("[3/3] Static files ready in out/");
} finally {
  // Restore API routes
  if (existsSync(backupPath)) {
    renameSync(backupPath, apiPath);
    console.log("       Restored API routes");
  }
}

console.log("=".repeat(40));
console.log("Done! Now run: firebase deploy --only hosting");
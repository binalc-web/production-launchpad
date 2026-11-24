/**
 * npm sometimes skips optional platform packages (@tailwindcss/oxide-*, etc.).
 * Install them explicitly when missing so `vite` works on the host OS / Alpine Docker.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = join(frontendRoot, "node_modules");

/** True on Alpine Linux images (musl libc). */
function isAlpineMusl() {
  return existsSync("/etc/alpine-release");
}

function hasPackage(name) {
  return existsSync(join(nodeModules, name));
}

function packagesForPlatform() {
  const { arch, platform } = process;

  if (platform === "darwin") {
    if (arch === "arm64") {
      return [
        "@tailwindcss/oxide-darwin-arm64",
        "lightningcss-darwin-arm64",
        "@rollup/rollup-darwin-arm64",
      ];
    }
    if (arch === "x64") {
      return [
        "@tailwindcss/oxide-darwin-x64",
        "lightningcss-darwin-x64",
        "@rollup/rollup-darwin-x64",
      ];
    }
  }

  if (platform === "linux") {
    const libc = isAlpineMusl() ? "musl" : "gnu";
    if (arch === "arm64") {
      return [
        `@tailwindcss/oxide-linux-arm64-${libc}`,
        `lightningcss-linux-arm64-${libc}`,
        `@rollup/rollup-linux-arm64-${libc}`,
      ];
    }
    if (arch === "x64") {
      return [
        `@tailwindcss/oxide-linux-x64-${libc}`,
        `lightningcss-linux-x64-${libc}`,
        `@rollup/rollup-linux-x64-${libc}`,
      ];
    }
  }

  return [];
}

const missing = packagesForPlatform().filter((name) => !hasPackage(name));
if (missing.length === 0) {
  process.exit(0);
}

console.log(`[ensure-native-deps] Installing: ${missing.join(", ")}`);

for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    execSync(`npm install --no-save ${missing.join(" ")}`, {
      cwd: frontendRoot,
      stdio: "inherit",
    });
    process.exit(0);
  } catch (err) {
    if (attempt === 3) {
      throw err;
    }
    const waitSec = attempt * 15;
    console.warn(
      `[ensure-native-deps] attempt ${attempt}/3 failed, retrying in ${waitSec}s…`,
    );
    execSync(`sleep ${waitSec}`);
  }
}

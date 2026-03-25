import { spawn } from "node:child_process";

const API_ORIGIN = "http://127.0.0.1:8788";
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 15 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command, args, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
      shell: process.platform === "win32"
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${label} timed out after ${COMMAND_TIMEOUT_MS}ms.`));
    }, COMMAND_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${label} exited with code ${code}.`));
        return;
      }
      resolve();
    });
  });
}

async function waitForHealth(origin) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) {
        return;
      }
    } catch {}

    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${origin}/health.`);
}

async function main() {
  const apiProcess = spawn("node", ["scripts/dev-api.mjs"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32"
  });

  try {
    await waitForHealth(API_ORIGIN);
    await runCommand("npm", ["run", "typecheck"], "typecheck");
    await runCommand("npm", ["run", "build:web"], "build:web");
    await runCommand("node", ["scripts/smoke-phase1-api.mjs"], "smoke:api");
    await runCommand("npm", ["run", "build:desktop"], "build:desktop");
    console.log("\nFull smoke suite passed.");
  } finally {
    if (!apiProcess.killed) {
      apiProcess.kill("SIGTERM");
      await new Promise((resolve) => apiProcess.once("exit", resolve));
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

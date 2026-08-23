#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, "..");
const customRoot = join(frontendRoot, "src", "custom");
const snapshotRoot = join(homedir(), ".honeyos", "ui-customization", "snapshots");

function cleanName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fileDigest(path) {
  const entries = (await readdir(path, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const hash = createHash("sha256");
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) hash.update(await fileDigest(child));
    else if (entry.isFile()) {
      hash.update(entry.name);
      hash.update(await readFile(child));
    }
  }
  return hash.digest("hex");
}

async function snapshot(label = "manual") {
  const safeLabel = cleanName(label) || "manual";
  const name = `${timestamp()}-${safeLabel}`;
  const target = join(snapshotRoot, name);
  await mkdir(snapshotRoot, { recursive: true });
  await cp(customRoot, target, { recursive: true, errorOnExist: true });
  await writeFile(join(target, ".honeyos-snapshot.json"), `${JSON.stringify({
    createdAt: new Date().toISOString(),
    source: customRoot,
    label: safeLabel,
  }, null, 2)}\n`);
  console.log(`Saved UI snapshot: ${name}`);
  return name;
}

async function list() {
  await mkdir(snapshotRoot, { recursive: true });
  const entries = (await readdir(snapshotRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  if (!entries.length) console.log("No UI snapshots yet.");
  else entries.forEach((entry) => console.log(entry));
}

async function status() {
  if (!(await exists(customRoot))) throw new Error(`Custom UI directory is missing: ${customRoot}`);
  const digest = await fileDigest(customRoot);
  console.log(`Custom UI: ${customRoot}`);
  console.log(`Fingerprint: ${digest.slice(0, 16)}`);
  console.log("Emergency safe UI: /new-ui/?honeyos-safe-ui=1");
}

async function restore(name) {
  const safeName = basename(cleanName(name));
  if (!safeName || safeName !== name) throw new Error("Choose a snapshot name printed by the list command.");
  const source = join(snapshotRoot, safeName);
  if (!(await exists(source))) throw new Error(`Snapshot not found: ${safeName}`);
  await snapshot("before-restore");
  await rm(customRoot, { recursive: true, force: true });
  await cp(source, customRoot, {
    recursive: true,
    filter: (path) => basename(path) !== ".honeyos-snapshot.json",
  });
  console.log(`Restored UI snapshot: ${safeName}`);
  console.log("Run pnpm build to apply it to HoneyOS.");
}

const [command = "status", ...args] = process.argv.slice(2).filter((arg) => arg !== "--");

try {
  if (command === "status") await status();
  else if (command === "snapshot") await snapshot(args.join("-") || "manual");
  else if (command === "list") await list();
  else if (command === "restore") await restore(args[0]);
  else throw new Error("Use: status | snapshot [label] | list | restore <snapshot>");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

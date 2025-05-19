#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

// Path to the playground directory (relative to this script)
const playgroundDir = path.join(__dirname, "..");

// Forward any additional CLI arguments
const args = process.argv.slice(2);

// Use npx to run vite directly
const child = spawn("npx", ["vite", "--open", ...args], {
  cwd: playgroundDir,
  stdio: "inherit",
  env: process.env, // Pass through env vars
});

child.on("exit", (code) => process.exit(code));

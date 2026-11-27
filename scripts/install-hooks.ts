// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// Run by `bun install` (the "prepare" script): points git at .githooks/, so
// that each commit message is checked before it is written. Silent and
// harmless where there is no git checkout (Vercel, the worker's image).
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"

if (existsSync(".git") && existsSync(".githooks"))
  spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "ignore",
  })

import fs from "node:fs/promises"
import path from "node:path"

const KNOWN_DATA_FILES = [
  "perfumes.json",
  "customers.json",
  "orders.json",
  "checkout-orders.json",
  "reviews.json",
  "suggestions.json",
  "sales.json"
]

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv
  const args = { cmd: cmd ?? "", out: "", from: "", uploads: false, file: "" }
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (token === "--out") {
      args.out = rest[i + 1] ?? ""
      i += 1
      continue
    }
    if (token === "--from") {
      args.from = rest[i + 1] ?? ""
      i += 1
      continue
    }
    if (token === "--uploads") {
      args.uploads = true
      continue
    }
    if (token === "--file") {
      args.file = rest[i + 1] ?? ""
      i += 1
      continue
    }
  }
  return args
}

async function exists(p) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function listJsonFiles(dir) {
  if (!(await exists(dir))) return []
  return (await fs.readdir(dir)).filter((f) => f.toLowerCase().endsWith(".json"))
}

function uniqueOrdered(items) {
  return Array.from(new Set(items.filter(Boolean)))
}

function dataStorageKey(fileName) {
  return `perfimes:storage:data/${fileName}`
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment.")
  }
  return { url: url.replace(/\/$/, ""), token }
}

async function upstashCommand(cfg, command) {
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Upstash command failed: ${response.status} ${errorText}`.trim())
  }

  const json = (await response.json().catch(() => null)) ?? null
  return typeof json === "object" && json !== null && "result" in json ? json.result : null
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const from = path.join(src, e.name)
    const to = path.join(dest, e.name)
    if (e.isDirectory()) {
      await copyDir(from, to)
    } else if (e.isFile()) {
      await fs.copyFile(from, to)
    }
  }
}

async function backup({ out, uploads }) {
  const projectRoot = process.cwd()
  const dataDir = path.join(projectRoot, "data")
  const backupRoot = out ? path.resolve(out) : path.join(projectRoot, "backups", nowStamp())
  await fs.mkdir(backupRoot, { recursive: true })

  const copied = []
  if (await exists(dataDir)) {
    const files = (await fs.readdir(dataDir)).filter((f) => f.toLowerCase().endsWith(".json"))
    const destData = path.join(backupRoot, "data")
    await fs.mkdir(destData, { recursive: true })
    for (const f of files) {
      const from = path.join(dataDir, f)
      const to = path.join(destData, f)
      await fs.copyFile(from, to)
      copied.push(`data/${f}`)
    }
  }

  if (uploads) {
    const uploadsDir = path.join(projectRoot, "public", "uploads")
    if (await exists(uploadsDir)) {
      await copyDir(uploadsDir, path.join(backupRoot, "public", "uploads"))
      copied.push("public/uploads/**")
    }
  }

  await fs.writeFile(
    path.join(backupRoot, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        copied
      },
      null,
      2
    ),
    "utf8"
  )

  process.stdout.write(`${backupRoot}\n`)
}

async function restore({ from, uploads }) {
  if (!from) throw new Error("Missing --from <backupDir>")
  const projectRoot = process.cwd()
  const backupRoot = path.resolve(from)

  const backupData = path.join(backupRoot, "data")
  if (await exists(backupData)) {
    const files = (await fs.readdir(backupData)).filter((f) => f.toLowerCase().endsWith(".json"))
    const destData = path.join(projectRoot, "data")
    await fs.mkdir(destData, { recursive: true })
    for (const f of files) {
      await fs.copyFile(path.join(backupData, f), path.join(destData, f))
    }
  }

  if (uploads) {
    const backupUploads = path.join(backupRoot, "public", "uploads")
    if (await exists(backupUploads)) {
      const destUploads = path.join(projectRoot, "public", "uploads")
      await fs.mkdir(destUploads, { recursive: true })
      await copyDir(backupUploads, destUploads)
    }
  }
}

async function syncUpstash({ file }) {
  const cfg = getUpstashConfig()
  const projectRoot = process.cwd()
  const dataDir = path.join(projectRoot, "data")
  const localFiles = await listJsonFiles(dataDir)
  const defaultCandidates = uniqueOrdered([
    ...KNOWN_DATA_FILES.filter((entry) => localFiles.includes(entry)),
    ...localFiles
  ])
  const candidates = file ? [file] : defaultCandidates
  if (!candidates.length) {
    throw new Error("No local JSON files found in data/.")
  }
  const synced = []
  const skipped = []

  for (const entry of candidates) {
    const sourceFile = path.join(dataDir, entry)
    if (!(await exists(sourceFile))) {
      skipped.push(entry)
      continue
    }

    const value = await fs.readFile(sourceFile, "utf8")
    const key = dataStorageKey(entry)
    await upstashCommand(cfg, ["SET", key, value])
    synced.push(key)
  }

  process.stdout.write(`${JSON.stringify({ synced, skipped }, null, 2)}\n`)
}

async function pullUpstash({ file }) {
  const cfg = getUpstashConfig()
  const projectRoot = process.cwd()
  const dataDir = path.join(projectRoot, "data")
  const localFiles = await listJsonFiles(dataDir)
  const candidates = file ? [file] : uniqueOrdered([...KNOWN_DATA_FILES, ...localFiles])
  const pulled = []
  const missing = []

  await fs.mkdir(dataDir, { recursive: true })

  for (const entry of candidates) {
    const key = dataStorageKey(entry)
    const value = await upstashCommand(cfg, ["GET", key])
    if (typeof value !== "string") {
      missing.push(entry)
      continue
    }
    await fs.writeFile(path.join(dataDir, entry), value, "utf8")
    pulled.push(entry)
  }

  process.stdout.write(`${JSON.stringify({ pulled, missing }, null, 2)}\n`)
}

async function statusUpstash({ file }) {
  const cfg = getUpstashConfig()
  const projectRoot = process.cwd()
  const dataDir = path.join(projectRoot, "data")
  const localFiles = await listJsonFiles(dataDir)
  const candidates = file ? [file] : uniqueOrdered([...KNOWN_DATA_FILES, ...localFiles])
  const files = []

  for (const entry of candidates) {
    const localPath = path.join(dataDir, entry)
    const remoteValue = await upstashCommand(cfg, ["GET", dataStorageKey(entry)])
    files.push({
      file: entry,
      localExists: await exists(localPath),
      remoteExists: typeof remoteValue === "string"
    })
  }

  process.stdout.write(`${JSON.stringify({ files }, null, 2)}\n`)
}

const args = parseArgs(process.argv.slice(2))
if (args.cmd === "backup") {
  await backup({ out: args.out, uploads: args.uploads })
} else if (args.cmd === "restore") {
  await restore({ from: args.from, uploads: args.uploads })
} else if (args.cmd === "sync-upstash") {
  await syncUpstash({ file: args.file })
} else if (args.cmd === "pull-upstash") {
  await pullUpstash({ file: args.file })
} else if (args.cmd === "status-upstash") {
  await statusUpstash({ file: args.file })
} else {
  process.stderr.write(
    "Usage:\n" +
      "  node scripts/maintenance.mjs backup [--out <dir>] [--uploads]\n" +
      "  node scripts/maintenance.mjs restore --from <dir> [--uploads]\n" +
      "  node scripts/maintenance.mjs sync-upstash [--file <name.json>]\n" +
      "  node scripts/maintenance.mjs pull-upstash [--file <name.json>]\n" +
      "  node scripts/maintenance.mjs status-upstash [--file <name.json>]\n"
  )
  process.exitCode = 1
}

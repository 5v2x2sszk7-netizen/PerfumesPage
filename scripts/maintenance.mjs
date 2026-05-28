import fs from "node:fs/promises"
import path from "node:path"

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv
  const args = { cmd: cmd ?? "", out: "", from: "", uploads: false }
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

const args = parseArgs(process.argv.slice(2))
if (args.cmd === "backup") {
  await backup({ out: args.out, uploads: args.uploads })
} else if (args.cmd === "restore") {
  await restore({ from: args.from, uploads: args.uploads })
} else {
  process.stderr.write("Usage:\n  node scripts/maintenance.mjs backup [--out <dir>] [--uploads]\n  node scripts/maintenance.mjs restore --from <dir> [--uploads]\n")
  process.exitCode = 1
}

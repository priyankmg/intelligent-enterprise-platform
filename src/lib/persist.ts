import fs from "fs";
import path from "path";

// Vercel serverless functions run in a read-only filesystem except /tmp
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");

function getDataPath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readJsonFile<T>(filename: string): T | null {
  try {
    ensureDataDir();
    const filePath = getDataPath(filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(filename: string, data: unknown): void {
  const filePath = getDataPath(filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

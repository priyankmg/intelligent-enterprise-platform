import { readJsonFile, writeJsonFile } from "@/lib/persist";

export type FeedbackReaction = "thumbs_up" | "thumbs_down";

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  type: "reaction" | "text";
  reaction?: FeedbackReaction;
  name?: string;
  message?: string;
  page?: string;
}

const FILE = "feedback/feedback.json";
let entries: FeedbackEntry[] = [];
let loaded = false;
let seq = 1;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<FeedbackEntry[]>(FILE);
  if (Array.isArray(data)) {
    entries = data;
    const nums = data.map((e) => parseInt(e.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    seq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

export function appendFeedback(entry: Omit<FeedbackEntry, "id" | "timestamp">): FeedbackEntry {
  load();
  const record: FeedbackEntry = {
    ...entry,
    id: `fb-${seq++}`,
    timestamp: new Date().toISOString(),
  };
  entries.push(record);
  writeJsonFile(FILE, entries);
  return record;
}

export function listFeedback(limit = 100): FeedbackEntry[] {
  load();
  return [...entries].reverse().slice(0, limit);
}

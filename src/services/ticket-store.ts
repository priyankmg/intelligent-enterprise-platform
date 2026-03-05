import type { HealingTicket } from "@/data-layer/types";
import { readJsonFile, writeJsonFile } from "@/lib/persist";

const FILENAME = "tickets.json";

let tickets: HealingTicket[] = [];
let idSeq = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<HealingTicket[]>(FILENAME);
  if (Array.isArray(data)) {
    tickets = data;
    const nums = data.map((t) => parseInt(t.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    idSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function save(): void {
  writeJsonFile(FILENAME, tickets);
}

export function createTicket(ticket: Omit<HealingTicket, "id" | "createdAt" | "status">): HealingTicket {
  load();
  const entry: HealingTicket = {
    ...ticket,
    id: `tkt-${idSeq++}`,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  tickets.push(entry);
  save();
  return entry;
}

export function getTicket(id: string): HealingTicket | undefined {
  load();
  return tickets.find((t) => t.id === id);
}

export function listTickets(systemName?: string, type?: "engineering" | "fyi"): HealingTicket[] {
  load();
  let list = [...tickets].reverse();
  if (systemName) list = list.filter((t) => t.systemName === systemName);
  if (type) list = list.filter((t) => t.type === type);
  return list;
}

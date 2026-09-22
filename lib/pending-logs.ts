/** A gym is the worst place a phone ever has to talk to a server:
 *  a basement, a steel rack, and thick walls. When a save fails there,
 *  the set is still done — losing it because the signal dropped turns
 *  the log into something a member stops trusting, and an untrusted log
 *  stops being filled in.
 *
 *  So every write is mirrored to localStorage first and only cleared
 *  once the server has taken it. Anything still here on the next load,
 *  or when the connection returns, is retried.
 *
 *  Keyed by program item and date, matching the upsert's own conflict
 *  target, so a retry can never duplicate a row. */

const KEY = "fc.pending-logs.v1";

export interface PendingLog {
  program_item_id: string;
  student_id: string;
  performed_on: string;
  weight_kg: number | null;
  completed: boolean;
}

function keyOf(log: PendingLog) {
  return `${log.program_item_id}:${log.performed_on}`;
}

/** localStorage throws in private mode and when storage is full or
 *  blocked. None of that may take the workout screen down with it. */
function read(): Record<string, PendingLog> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, PendingLog>)
      : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, PendingLog>) {
  try {
    if (Object.keys(all).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing useful to do: the set stays in memory for this session.
  }
}

export function remember(log: PendingLog) {
  const all = read();
  // Last write for an item on a day wins, which is what the upsert does.
  all[keyOf(log)] = log;
  write(all);
}

export function forget(log: PendingLog) {
  const all = read();
  delete all[keyOf(log)];
  write(all);
}

export function pending(): PendingLog[] {
  return Object.values(read());
}

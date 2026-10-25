/** Line icons for Admin › Mail (24×24, drawn with the current text colour). Usable from server and client components. */
const PATHS = {
  inbox: "M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6H3v-6z",
  sent: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  drafts: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  spam: "M12 3 2 20h20zM12 10v4.5M12 17.2v.3",
  trash: "M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13",
  outbox: "M12 14V3M8 7l4-4 4 4M3 13h5l1.5 3h5l1.5-3h5v7H3z",
  folder: "M3 6.5h6l2 2h10V19H3z",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  plus: "M12 5v14M5 12h14",
  at: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.6 7.2",
  clip: "M20.5 11.5 12.7 19.3a5 5 0 0 1-7-7l8.1-8.1a3.4 3.4 0 0 1 4.8 4.8l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4",
  image: "M4 5h16v14H4zM4 15.5l4.5-4.5 4 4 2.5-2.5L20 17.5M15.5 9.2v.1",
  close: "M6 6l12 12M18 6 6 18",
  minus: "M5 12h14",
  expand: "M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7",
  shrink: "M10 4v6H4M14 20v-6h6M4 10l6-6M20 14l-6 6",
  reply: "M10 7 4 12.5 10 18M4 12.5h10a6 6 0 0 1 6 6V20",
  left: "M15 18 9 12l6-6",
  right: "M9 6l6 6-6 6",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5",
  external: "M14 4h6v6M20 4 10 14M18 14v6H4V6h6",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  power: "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M4 19.5h16",
  check: "M5 12.5 9.5 17 19 7",
  restore: "M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6H3v-6zM12 7v6M9.5 9.5 12 7l2.5 2.5",
} as const;

export type MailIconName = keyof typeof PATHS;

export function MailIcon({ name, size = 18 }: { name: MailIconName; size?: number }) {
  return (
    <svg className="mx-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Zoho folder types (Inbox, Sent, Drafts, Spam, Trash, Outbox…) to icons; custom folders get a plain folder. */
export function folderIcon(type: string): MailIconName {
  const t = type.toLowerCase();
  if (t.includes("inbox")) return "inbox";
  if (t.includes("sent")) return "sent";
  if (t.includes("draft") || t.includes("template")) return "drafts";
  if (t.includes("spam")) return "spam";
  if (t.includes("trash")) return "trash";
  if (t.includes("outbox")) return "outbox";
  if (t.includes("archive")) return "archive";
  return "folder";
}

const COLORS = ["#1d5bd8", "#072f54", "#0f7a4f", "#6d4bd1", "#b45309", "#0e7490", "#be3d6b"];

/** A round badge with the sender's initials, coloured the same way every time for the same person. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const clean = name.replace(/<[^>]*>|["']/g, "").trim() || "?";
  const words = clean.includes("@") ? [clean.split("@")[0]] : clean.split(/\s+/);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
  let h = 0;
  for (const c of clean.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span className="mx-avatar" style={{ width: size, height: size, background: COLORS[h % COLORS.length], fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

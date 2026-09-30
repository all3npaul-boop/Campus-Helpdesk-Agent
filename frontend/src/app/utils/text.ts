/** Lower-case, strip punctuation, collapse whitespace so keywords match whole words. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function timeAgo(iso: string | Date, now = Date.now()): string {
  const diffMin = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function clockTime(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function shortDate(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function sentenceCase(text: string): string {
  const t = text.trim().replace(/[.!?]+$/, '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

export function statusTone(status: string): 'navy' | 'amber' | 'green' | 'red' {
  if (status === 'Awaiting Action') return 'red';
  if (status === 'Completed' || status === 'Resolved') return 'green';
  if (status === 'In Review' || status === 'In Progress') return 'amber';
  return 'navy';
}

/** "Today · 10:42 AM", "Yesterday · 4:15 PM", "Sep 28 · 2:30 PM". */
export function friendlyTime(value: string | Date, now = new Date()): string {
  const d = new Date(value);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return `Today · ${time}`;
  if (days === 1) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
}

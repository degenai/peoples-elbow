export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

export function generateDateStr(date = new Date()) {
  return date.toISOString();
}

export function getTimeSince(dateStr) {
  if (!dateStr) return { days: Infinity, weeks: Infinity, formatted: 'Never' };

  const then = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - then);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  let formatted = '';
  if (diffDays === 0) formatted = 'Today';
  else if (diffDays === 1) formatted = 'Yesterday';
  else if (diffDays < 7) formatted = `${diffDays} days ago`;
  else if (diffWeeks === 1) formatted = '1 week ago';
  else if (diffDays < 30) formatted = `${diffWeeks} weeks ago`;
  else if (diffMonths === 1) formatted = '1 month ago';
  else formatted = `${diffMonths} months ago`;

  return { days: diffDays, weeks: diffWeeks, formatted };
}

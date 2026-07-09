// Highlights query matches inside text for search results.
export function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const parts: Array<{ value: string; hit: boolean }> = [];
  let cursor = 0;
  let index = lower.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push({ value: text.slice(cursor, index), hit: false });
    parts.push({ value: text.slice(index, index + needle.length), hit: true });
    cursor = index + needle.length;
    index = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), hit: false });
  return (
    <>
      {parts.map((part, partIndex) =>
        part.hit ? <mark key={partIndex} className="qcx-mark">{part.value}</mark> : <span key={partIndex}>{part.value}</span>,
      )}
    </>
  );
}

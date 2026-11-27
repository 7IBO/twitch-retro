/**
 * Minimal, fast CSV reader. Only the columns asked for are ever sliced out of
 * the text: every other column (IP, city, device, browser...) is skipped
 * without being copied, so private fields never become JavaScript strings.
 */
export function readCsv(
  text: string,
  wanted: readonly string[],
  onRow: (row: string[]) => void,
): void {
  const len = text.length;
  let pos = 0;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  // Header
  const header: string[] = [];
  {
    let field = '';
    let inQuotes = false;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (inQuotes) {
        if (c === 34) {
          if (text.charCodeAt(pos + 1) === 34) { field += '"'; pos += 2; continue; }
          inQuotes = false; pos++; continue;
        }
        field += text[pos++];
        continue;
      }
      if (c === 34) { inQuotes = true; pos++; continue; }
      if (c === 44) { header.push(field); field = ''; pos++; continue; }
      if (c === 10 || c === 13) {
        header.push(field);
        if (c === 13 && text.charCodeAt(pos + 1) === 10) pos++;
        pos++;
        break;
      }
      field += text[pos++];
    }
    if (pos >= len && field) header.push(field);
  }

  // Column index -> slot in output row, -1 when not wanted.
  const slot = new Int32Array(header.length + 1).fill(-1);
  wanted.forEach((name, i) => {
    const idx = header.indexOf(name);
    if (idx >= 0) slot[idx] = i;
  });
  const nWanted = wanted.length;
  const maxCol = header.length;

  while (pos < len) {
    const row: string[] = new Array(nWanted).fill('');
    let col = 0;
    let any = false;
    for (;;) {
      // Read one field starting at pos.
      const s = col < maxCol ? slot[col] : -1;
      let c = text.charCodeAt(pos);
      if (c === 34) {
        // Quoted field
        pos++;
        let start = pos;
        let buf = '';
        let hasEsc = false;
        for (;;) {
          const q = text.indexOf('"', pos);
          if (q < 0) { pos = len; break; }
          if (text.charCodeAt(q + 1) === 34) {
            if (s >= 0) buf += text.slice(start, q + 1);
            hasEsc = true;
            pos = q + 2;
            start = pos;
            continue;
          }
          if (s >= 0) {
            const tail = text.slice(start, q);
            row[s] = hasEsc ? buf + tail : tail;
          }
          pos = q + 1;
          break;
        }
        c = text.charCodeAt(pos);
      } else {
        const start = pos;
        while (pos < len) {
          c = text.charCodeAt(pos);
          if (c === 44 || c === 10 || c === 13) break;
          pos++;
        }
        if (s >= 0 && pos > start) row[s] = text.slice(start, pos);
      }
      if (pos > 0) any = true;
      if (pos >= len) { col++; break; }
      c = text.charCodeAt(pos);
      if (c === 44) { pos++; col++; continue; }
      // End of line
      if (c === 13 && text.charCodeAt(pos + 1) === 10) pos++;
      pos++;
      col++;
      break;
    }
    if (any && !(col === 1 && row.every((v) => v === ''))) onRow(row);
  }
}

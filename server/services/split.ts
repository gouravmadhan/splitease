/** Equal split in integer paise. Leftover paise go one each to the first participants, so shares always sum exactly. */
export function equalSplit(totalPaise: number, ids: string[]) {
  if (!ids.length) throw new Error("At least one participant is required");
  const base = Math.floor(totalPaise / ids.length);
  let rem = totalPaise - base * ids.length;
  return ids.map((memberId) => ({ memberId, sharePaise: base + (rem-- > 0 ? 1 : 0) }));
}

/**
 * Dạng hiển thị của từng từ trên thẻ sắp xếp.
 * Từ đầu câu được hạ về chữ thường để không lộ vị trí, trừ khi bản thân từ đó luôn viết hoa
 * (I, I'm, Vietnam) hoặc là tên riêng không có trong từ điển.
 */
export function sentenceChips(tokens: { surface: string; lemma: string | null }[]): string[] {
  return tokens.map((t, i) => {
    if (i !== 0 || !t.lemma) return t.surface;
    const first = t.lemma[0];
    const alwaysCapital = first === first.toUpperCase() && first !== first.toLowerCase();
    return alwaysCapital ? t.surface : t.surface[0].toLowerCase() + t.surface.slice(1);
  });
}

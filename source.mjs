export const SOURCE = 'https://www.ybavalues.com';
export const SOURCE_PAGE = `${SOURCE}/values`;

function readArray(text, start) {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else {
      if (c === '"') quoted = true;
      else if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('Неполные данные источника');
}

export function parseCatalog(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)];
  const text = chunks.map(m => JSON.parse(m[1])).join('');
  for (const marker of text.matchAll(/"items":\[/g)) {
    let items;
    try { items = readArray(text, marker.index + 8); } catch { continue; }
    if (!Array.isArray(items) || !items.length || !items[0]?.slug || !('value' in items[0])) continue;
    const ids = new Set();
    const catalog = items.map(item => {
      if (typeof item.slug !== 'string' || !/^[a-z0-9-]+$/i.test(item.slug) || ids.has(item.slug)) throw new Error('Некорректный ID скина');
      ids.add(item.slug);
      if (typeof item.name !== 'string' || typeof item.type !== 'string' || !Number.isFinite(item.value) || item.value < 0) throw new Error('Некорректная стоимость скина');
      const image = new URL(item.image, SOURCE);
      if (image.origin !== SOURCE || !image.pathname.startsWith('/items/')) throw new Error('Неизвестный источник изображения');
      return {
        id: item.slug, name: item.name, stand: item.type, value: item.value,
        image: image.pathname, sourceTier: item.tier,
        gradient: Array.isArray(item.gradient) ? item.gradient.filter(x => /^#[a-f0-9]{6}$/i.test(x)).slice(0, 2) : [],
        undocumented: Boolean(item.undocumented),
        trend: Number.isFinite(item.trend?.pct) ? item.trend.pct : null,
      };
    });
    if (catalog.length < 10) throw new Error('Источник вернул неполный каталог');
    return catalog;
  }
  throw new Error('Структура YBA Values изменилась. Не удалось прочитать каталог.');
}

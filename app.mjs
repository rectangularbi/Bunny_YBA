import { TIERS, DEFAULT_LIMITS, validLimits, rankItems, filterItems } from './model.mjs';

const $ = id => document.getElementById(id);
const CHANNEL_CREDIT = 'Telegramm: @bunnyYBA';
const STATIC_MODE = document.body.dataset.mode === 'static';
const imageSource = item => STATIC_MODE ? `./data/images/${encodeURIComponent(item.image.split('/').pop())}` : `/api/image?path=${encodeURIComponent(item.image)}`;
const fmt = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value);
const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'скин' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'скина' : 'скинов';
let data = null, mode = 'all', selected = new Set(), limits = [...DEFAULT_LIMITS], busy = false, exporting = false, storageAvailable = true;
let toastTimer;
try {
  const saved = JSON.parse(localStorage.getItem('yba-price-tierlist-v1') || '{}');
  if (Array.isArray(saved.selected)) selected = new Set(saved.selected.filter(x => typeof x === 'string'));
  if (validLimits(saved.limits)) limits = saved.limits;
} catch { storageAvailable = false; }
function save() {
  try {
    localStorage.setItem('yba-price-tierlist-v1', JSON.stringify({ selected: [...selected], limits }));
    $('storage-status').textContent = 'Выбор и границы сохранены в этом браузере.';
  } catch {
    storageAvailable = false;
    $('storage-status').textContent = 'Браузер не разрешает сохранение. Выбор действует до закрытия вкладки.';
  }
}
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}
function bounds(tier) {
  switch (tier) {
    case 'S': return `≥ ${fmt(limits[0])}`;
    case 'A': return `${fmt(limits[1])} – < ${fmt(limits[0])}`;
    case 'B': return `${fmt(limits[2])} – < ${fmt(limits[1])}`;
    case 'C': return `${fmt(limits[3])} – < ${fmt(limits[2])}`;
    case 'D': return `> 0 – < ${fmt(limits[3])}`;
    case 'F': return '0 value';
  }
}
function currentFilter() {
  const min = $('min').value === '' ? null : Number($('min').value);
  const max = $('max').value === '' ? null : Number($('max').value);
  const invalid = (min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0)) || (min !== null && max !== null && min > max);
  $('filter-error').hidden = !invalid;
  $('filter-error').textContent = 'Укажи неотрицательные цены. Минимальная цена должна быть не выше максимальной.';
  return { query: $('query').value, stand: $('stand').value, min, max, invalid, selected: mode === 'mine' ? selected : null };
}
function visibleItems() {
  const filter = currentFilter();
  return !data || filter.invalid ? [] : filterItems(data.items, filter);
}
function createCard(item) {
  const card = document.createElement('button');
  card.type = 'button'; card.className = 'skin-card'; card.dataset.id = item.id;
  card.classList.toggle('selected', selected.has(item.id));
  card.setAttribute('aria-pressed', String(selected.has(item.id)));
  card.setAttribute('aria-label', `${item.name}, ${fmt(item.value)} value. ${selected.has(item.id) ? 'Убрать из моего списка' : 'Добавить в мой список'}`);
  card.title = `${item.name}\n${fmt(item.value)} value • ${item.stand}${item.undocumented ? '\nUndocumented — отметка источника' : ''}`;
  const art = document.createElement('span'); art.className = 'skin-art';
  item.gradient?.forEach((color, i) => { art.style.setProperty(`--g${i + 1}`, color); });
  const img = document.createElement('img');
  img.src = imageSource(item);
  img.alt = item.name; img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => { art.classList.add('image-missing'); }, { once: true });
  art.append(img);
  const credit = document.createElement('span'); credit.className = 'photo-credit'; credit.textContent = CHANNEL_CREDIT; credit.setAttribute('aria-hidden', 'true'); art.append(credit);
  const mark = document.createElement('span'); mark.className = 'pick-mark'; mark.textContent = selected.has(item.id) ? '✓' : '+'; mark.setAttribute('aria-hidden', 'true');
  const info = document.createElement('span'); info.className = 'skin-info';
  const name = document.createElement('span'); name.className = 'skin-name'; name.textContent = item.name;
  const bottom = document.createElement('span'); bottom.className = 'skin-bottom';
  const price = document.createElement('span'); price.className = 'skin-price'; price.textContent = fmt(item.value);
  const stand = document.createElement('span'); stand.className = 'skin-stand'; stand.textContent = item.stand;
  bottom.append(price, stand); info.append(name, bottom); card.append(art, mark, info);
  return card;
}
function emptyBoard(title, message) {
  const box = document.createElement('div'); box.className = 'empty-state';
  const icon = document.createElement('span'); icon.className = 'empty-symbol'; icon.textContent = '◇'; icon.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('h2'); heading.textContent = title;
  const description = document.createElement('p'); description.textContent = message;
  box.append(icon, heading, description); $('board').replaceChildren(box);
}
function render() {
  if (!data) return;
  const visible = visibleItems();
  const activeFilter = $('query').value || $('stand').value || $('min').value || $('max').value;
  $('reset-filters').hidden = !activeFilter;
  $('all-count').textContent = data.items.length; $('mine-count').textContent = selected.size;
  $('all-tab').classList.toggle('active', mode === 'all'); $('mine-tab').classList.toggle('active', mode === 'mine');
  $('all-tab').setAttribute('aria-selected', String(mode === 'all')); $('mine-tab').setAttribute('aria-selected', String(mode === 'mine'));
  $('board').setAttribute('aria-labelledby', mode === 'all' ? 'all-tab' : 'mine-tab');
  $('board').setAttribute('aria-busy', 'false');
  $('result-count').replaceChildren();
  const number = document.createElement('strong'); number.textContent = `${visible.length} ${plural(visible.length)}`;
  $('result-count').append(number, document.createTextNode(` в тирлисте · по убыванию цены`));
  $('export').disabled = !visible.length || exporting;
  $('select-visible').hidden = mode === 'mine'; $('select-visible').disabled = !visible.length;
  $('clear-selection').hidden = !selected.size;
  if (!storageAvailable) $('storage-status').textContent = 'Выбор действует до закрытия вкладки: сохранение недоступно.';
  if (!visible.length) {
    if (mode === 'mine' && !selected.size) emptyBoard('Твой список пока пуст', 'Открой «Все скины» и нажми на нужные карточки. Их цены автоматически определят уровни.');
    else emptyBoard('Скины не найдены', 'Попробуй другое название, стенд или диапазон цены.');
    return;
  }
  const grouped = rankItems(visible, limits);
  const fragment = document.createDocumentFragment();
  for (const tier of TIERS) {
    const items = grouped[tier.id];
    const row = document.createElement('section'); row.className = 'tier-row'; row.dataset.tier = tier.id; row.style.setProperty('--tier-color', tier.color);
    row.setAttribute('aria-label', `Уровень ${tier.id}, ${bounds(tier.id)}, ${items.length} ${plural(items.length)}`);
    const label = document.createElement('div'); label.className = 'tier-label';
    const letter = document.createElement('span'); letter.className = 'tier-letter'; letter.textContent = tier.id;
    const range = document.createElement('span'); range.className = 'tier-range'; range.textContent = bounds(tier.id);
    const count = document.createElement('span'); count.className = 'tier-count'; count.textContent = `${items.length} ${plural(items.length)}`;
    const labelInner = document.createElement('div'); labelInner.className = 'tier-label-inner'; labelInner.append(letter, range, count); label.append(labelInner);
    const cards = document.createElement('div'); cards.className = 'tier-cards';
    if (items.length) cards.append(...items.map(createCard));
    else { const empty = document.createElement('p'); empty.className = 'empty-row'; empty.textContent = 'В этом уровне пока нет скинов'; cards.append(empty); }
    row.append(label, cards); fragment.append(row);
  }
  $('board').replaceChildren(fragment);
}
async function load(force = false, quiet = false) {
  if (busy) return;
  busy = true; $('refresh').disabled = true;
  if (!quiet) $('refresh').textContent = 'Загружаем…';
  try {
    const catalogUrl = STATIC_MODE ? `./data/catalog.json?t=${Date.now()}` : `/api/catalog${force ? '?refresh=1' : ''}`;
    const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(25000) });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.items) || !payload.items.length) throw new Error(payload.error || 'Каталог недоступен');
    data = payload;
    const available = new Set(data.items.map(i => i.id));
    selected = new Set([...selected].filter(id => available.has(id)));
    const stand = $('stand').value;
    $('stand').replaceChildren(new Option('Все стенды', ''));
    for (const type of [...new Set(data.items.map(i => i.stand))].sort()) $('stand').add(new Option(type, type));
    $('stand').value = [...$('stand').options].some(o => o.value === stand) ? stand : '';
    $('total').textContent = data.items.length;
    $('highest').textContent = fmt(Math.max(...data.items.map(i => i.value)));
    $('updated').textContent = `Получено ${new Date(data.fetchedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    $('sync-dot').className = `sync-dot ${data.stale ? 'stale' : 'ready'}`;
    $('notice').hidden = !data.stale;
    $('notice').textContent = data.warning || '';
    render();
    if (force && !quiet && !data.stale) toast('Цены загружены. Тирлист пересчитан.');
    if (data.refreshing) setTimeout(() => load(true, true), 0);
  } catch (error) {
    $('notice').hidden = false;
    $('notice').textContent = data ? 'Не удалось обновить цены. Оставлены последние загруженные данные. Нажми «Обновить», чтобы повторить.' : 'Не удалось загрузить каталог. Проверь интернет и нажми «Обновить».';
    $('sync-dot').className = 'sync-dot stale';
    if (!data) { emptyBoard('Нет соединения с источником', 'Нажми «Обновить», чтобы загрузить цены и изображения.'); $('board').setAttribute('aria-busy', 'false'); $('updated').textContent = 'Каталог недоступен'; }
  } finally {
    busy = false; $('refresh').disabled = false; $('refresh').innerHTML = '<span aria-hidden="true">↻</span> Обновить';
  }
}
$('filters').addEventListener('submit', e => e.preventDefault());
for (const id of ['query', 'stand', 'min', 'max']) $(id).addEventListener('input', render);
$('reset-filters').addEventListener('click', () => { for (const id of ['query', 'stand', 'min', 'max']) $(id).value = ''; render(); });
$('all-tab').addEventListener('click', () => { mode = 'all'; render(); });
$('mine-tab').addEventListener('click', () => { mode = 'mine'; render(); });
document.querySelector('.tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault(); mode = e.key === 'Home' || e.key === 'ArrowLeft' ? 'all' : 'mine'; render(); $(mode === 'all' ? 'all-tab' : 'mine-tab').focus();
});
$('board').addEventListener('click', e => {
  const card = e.target.closest('.skin-card'); if (!card) return;
  const id = card.dataset.id;
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  save();
  if (mode === 'mine') {
    const buttons = [...$('board').querySelectorAll('.skin-card')]; const index = buttons.indexOf(card);
    render(); const next = $('board').querySelectorAll('.skin-card'); (next[Math.min(index, next.length - 1)] || $('mine-tab')).focus();
  } else {
    card.classList.toggle('selected', selected.has(id)); card.setAttribute('aria-pressed', String(selected.has(id)));
    card.querySelector('.pick-mark').textContent = selected.has(id) ? '✓' : '+';
    const item = data.items.find(i => i.id === id);
    card.setAttribute('aria-label', `${item.name}, ${fmt(item.value)} value. ${selected.has(id) ? 'Убрать из моего списка' : 'Добавить в мой список'}`);
    $('mine-count').textContent = selected.size; $('clear-selection').hidden = !selected.size;
  }
});
$('select-visible').addEventListener('click', () => { for (const i of visibleItems()) selected.add(i.id); save(); render(); toast(`В твоём списке ${selected.size} ${plural(selected.size)}.`); });
$('clear-selection').addEventListener('click', () => { selected.clear(); save(); render(); });
$('refresh').addEventListener('click', () => load(true));
const dialog = $('settings-dialog');
function fillSettings(values) {
  $('threshold-fields').replaceChildren(); $('settings-error').hidden = true;
  values.forEach((value, index) => {
    const tier = TIERS[index];
    const label = document.createElement('label'); label.className = 'threshold-field'; label.style.setProperty('--tier-color', tier.color);
    const badge = document.createElement('span'); badge.className = 'threshold-badge'; badge.textContent = tier.id;
    const text = document.createElement('span'); text.textContent = 'Цена от';
    const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.min = '0.000001'; input.required = true; input.value = value; input.setAttribute('aria-label', `Минимальная цена уровня ${tier.id}`);
    const unit = document.createElement('span'); unit.textContent = 'value'; label.append(badge, text, input, unit); $('threshold-fields').append(label);
  });
}
$('settings').addEventListener('click', () => { fillSettings(limits); dialog.showModal(); });
$('close-settings').addEventListener('click', () => dialog.close());
$('default-settings').addEventListener('click', () => fillSettings(DEFAULT_LIMITS));
$('settings-form').addEventListener('submit', e => {
  e.preventDefault();
  const values = [...$('threshold-fields').querySelectorAll('input')].map(input => Number(input.value));
  if (!validLimits(values)) { $('settings-error').textContent = 'Границы должны быть больше нуля и строго убывать: S > A > B > C.'; $('settings-error').hidden = false; return; }
  limits = values; save(); render(); dialog.close(); toast('Границы применены. Дорогие скины остаются выше.');
});

function loadExportImage(item) {
  return new Promise(resolve => {
    const img = new Image(); let settled = false;
    const finish = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const timer = setTimeout(() => finish(null), 20000);
    img.onload = () => finish(img); img.onerror = () => finish(null);
    img.src = imageSource(item);
  });
}
function wrap(ctx, text, width, maxLines) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const clipped = lines.slice(0, maxLines);
  for (let i = 0; i < clipped.length; i++) {
    let line = clipped[i];
    if (ctx.measureText(line).width > width || (i === maxLines - 1 && lines.length > maxLines)) {
      while (line && ctx.measureText(line + '…').width > width) line = line.slice(0, -1);
      clipped[i] = line + '…';
    }
  }
  return clipped;
}
$('export').addEventListener('click', async () => {
  const items = visibleItems(); if (!items.length || exporting) return;
  exporting = true; $('export').disabled = true;
  // Capture the current view so filters or a price refresh cannot change the export halfway through.
  const capturedLimits = [...limits], capturedTime = data.fetchedAt, capturedMode = mode;
  const capturedFilter = [$('query').value && `Поиск: ${$('query').value}`, $('stand').value && `Стенд: ${$('stand').value}`, ($('min').value || $('max').value) && `Цена: ${$('min').value || '0'} — ${$('max').value || '∞'}`].filter(Boolean).join(' · ');
  try {
    const images = new Map(); let next = 0, loaded = 0;
    await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++]; images.set(item.id, await loadExportImage(item)); loaded++;
        $('export').textContent = `Фото ${loaded}/${items.length}`;
      }
    }));
    const rows = rankItems(items, capturedLimits);
    const W = 1440, margin = 28, labelWidth = 125, cardWidth = 117, cardHeight = 173, gap = 10, cols = 9, header = 200;
    const rowHeights = TIERS.map(t => Math.max(1, Math.ceil(rows[t.id].length / cols)) * (cardHeight + gap) + gap);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = header + rowHeights.reduce((a, b) => a + b, 0) + 70;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#100d1b'; ctx.fillRect(0, 0, W, canvas.height);
    const banner = ctx.createLinearGradient(0, 0, W, header); banner.addColorStop(0, '#2d2042'); banner.addColorStop(1, '#151020'); ctx.fillStyle = banner; ctx.fillRect(0, 0, W, header - 12);
    ctx.fillStyle = '#cbb1ff'; ctx.font = '700 12px Segoe UI, sans-serif'; ctx.fillText('BUNNYYBA / YOUR BIZARRE ADVENTURE', margin, 35);
    ctx.fillStyle = '#faf5ff'; ctx.font = '700 43px Segoe UI, sans-serif'; ctx.fillText('Дороже. Выше.', margin, 89);
    ctx.textAlign = 'right'; ctx.font = '700 23px Segoe UI, sans-serif'; ctx.fillStyle = '#e2ceff'; ctx.fillText(CHANNEL_CREDIT, W - margin, 45); ctx.textAlign = 'left';
    ctx.fillStyle = '#94949f'; ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText(`${capturedMode === 'mine' ? 'Мой список' : 'Все скины'} · ${items.length} ${plural(items.length)} · цены в value · ybavalues.com/values`, margin, 120);
    ctx.fillText(capturedFilter ? wrap(ctx, capturedFilter, W - 2 * margin, 1)[0] : `Данные получены: ${new Date(capturedTime).toLocaleString('ru-RU')}`, margin, 145);
    let y = header;
    TIERS.forEach((tier, index) => {
      const rowHeight = rowHeights[index];
      ctx.fillStyle = '#181321'; ctx.fillRect(margin, y, W - margin * 2, rowHeight - 1);
      ctx.fillStyle = tier.color; ctx.globalAlpha = .16; ctx.fillRect(margin, y, labelWidth, rowHeight - 1); ctx.globalAlpha = 1;
      ctx.fillStyle = tier.color; ctx.textAlign = 'center'; ctx.font = '800 43px Segoe UI, sans-serif'; ctx.fillText(tier.id, margin + labelWidth / 2, y + rowHeight / 2 - 9);
      const label = tier.id === 'S' ? `≥ ${fmt(capturedLimits[0])}` : tier.id === 'F' ? '0 value' : tier.id === 'D' ? `> 0 – < ${fmt(capturedLimits[3])}` : `${fmt(capturedLimits[index])} – < ${fmt(capturedLimits[index - 1])}`;
      ctx.font = '12px Segoe UI, sans-serif'; ctx.fillText(label, margin + labelWidth / 2, y + rowHeight / 2 + 14);
      ctx.font = '11px Segoe UI, sans-serif'; ctx.fillText(`${rows[tier.id].length} ${plural(rows[tier.id].length)}`, margin + labelWidth / 2, y + rowHeight / 2 + 35); ctx.textAlign = 'left';
      rows[tier.id].forEach((item, i) => {
        const x = margin + labelWidth + gap + (i % cols) * (cardWidth + gap);
        const cy = y + gap + Math.floor(i / cols) * (cardHeight + gap);
        ctx.fillStyle = '#262032'; ctx.fillRect(x, cy, cardWidth, cardHeight);
        const img = images.get(item.id);
        if (img) {
          const scale = Math.max(cardWidth / img.width, 110 / img.height);
          const sw = cardWidth / scale, sh = 110 / scale;
          ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * .25, sw, sh, x, cy, cardWidth, 110);
        } else {
          ctx.fillStyle = '#32323e'; ctx.fillRect(x, cy, cardWidth, 110); ctx.fillStyle = '#aaaabb'; ctx.font = '10px Segoe UI, sans-serif'; ctx.fillText('Фото недоступно', x + 8, cy + 56);
        }
        ctx.fillStyle = '#0c071ddb'; ctx.fillRect(x, cy + 95, cardWidth, 15); ctx.fillStyle = '#f4eaff'; ctx.font = '600 8px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(CHANNEL_CREDIT, x + cardWidth / 2, cy + 105, cardWidth - 8); ctx.textAlign = 'left';
        ctx.fillStyle = '#f3f2ef'; ctx.font = '600 10px Segoe UI, sans-serif';
        wrap(ctx, item.name, cardWidth - 14, 2).forEach((line, j) => ctx.fillText(line, x + 7, cy + 127 + j * 13));
        ctx.fillStyle = '#d5b9ff'; ctx.font = '700 14px Segoe UI, sans-serif'; ctx.fillText(fmt(item.value), x + 7, cy + 161);
        ctx.fillStyle = '#a9a9b4'; ctx.font = '9px Segoe UI, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(item.stand, x + cardWidth - 7, cy + 161); ctx.textAlign = 'left';
      });
      y += rowHeight;
    });
    ctx.fillStyle = '#94949f'; ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`Уровни по цене · Фото и value: YBA Values · Получено ${new Date(capturedTime).toLocaleString('ru-RU')}`, margin, canvas.height - 23);
    ctx.textAlign = 'right'; ctx.fillStyle = '#d5b9ff'; ctx.font = '700 17px Segoe UI, sans-serif'; ctx.fillText(CHANNEL_CREDIT, W - margin, canvas.height - 23); ctx.textAlign = 'left';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Не удалось создать PNG');
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `yba-tierlist-${new Date().toISOString().slice(0, 10)}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    const missing = [...images.values()].filter(x => !x).length;
    toast(missing ? `PNG сохранён. Для ${missing} фото источник недоступен — добавлены подписи.` : 'Тирлист сохранён в PNG.');
  } catch { toast('Не удалось сохранить PNG. Попробуй ещё раз или выбери меньше скинов.'); }
  finally { exporting = false; $('export').innerHTML = '<span aria-hidden="true">↓</span> Сохранить PNG'; $('export').disabled = !visibleItems().length; }
});
load();
setInterval(() => { if (!document.hidden && !exporting) load(false, true); }, 300000);

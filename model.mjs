export const TIERS = [
  { id: 'S', color: '#fa7880', label: 'Самые дорогие' },
  { id: 'A', color: '#f4ae75', label: 'Высокая стоимость' },
  { id: 'B', color: '#e9d778', label: 'Выше среднего' },
  { id: 'C', color: '#9ed2a0', label: 'Средняя стоимость' },
  { id: 'D', color: '#87bcdf', label: 'Низкая стоимость' },
  { id: 'F', color: '#a3a0ba', label: 'Нулевая стоимость' },
];
export const DEFAULT_LIMITS = [100, 25, 10, 1];
export function validLimits(limits) {
  return Array.isArray(limits) && limits.length === 4 && limits.every((v, i) => Number.isFinite(v) && v > 0 && (!i || v < limits[i - 1]));
}
export function tierFor(value, limits = DEFAULT_LIMITS) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Некорректная стоимость');
  if (!validLimits(limits)) throw new Error('Некорректные границы');
  if (value === 0) return 'F';
  return ['S', 'A', 'B', 'C'][limits.findIndex(min => value >= min)] ?? 'D';
}
export function rankItems(items, limits = DEFAULT_LIMITS) {
  const rows = Object.fromEntries(TIERS.map(t => [t.id, []]));
  for (const item of [...items].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))) rows[tierFor(item.value, limits)].push(item);
  return rows;
}
export function filterItems(items, { query = '', stand = '', min = null, max = null, selected = null } = {}) {
  const q = query.trim().toLocaleLowerCase();
  return items.filter(i => (!q || `${i.name} ${i.stand}`.toLocaleLowerCase().includes(q)) && (!stand || i.stand === stand) && (min === null || i.value >= min) && (max === null || i.value <= max) && (!selected || selected.has(i.id)));
}

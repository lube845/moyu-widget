// 本地"饭盒":午餐选项的纯 localStorage 持久化。
// 重写版:只保留饭名(去掉投喂人字段),用 item 字符串本身做 React key。
const STORAGE_KEY = 'moyu-lunch-items-v1';

export interface LunchItem {
  item: string;
}

const SEED_ITEMS: string[] = [
  '黄焖鸡',
  '麻辣烫',
  '肯德基',
  '兰州拉面',
  '沙县小吃',
  '盖浇饭',
  '日式便当',
  '米线',
  '汉堡',
];

function safeParse(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
    // dedupe(避免历史脏数据里有重复)
    return Array.from(new Set(items));
  } catch {
    return null;
  }
}

function seed(): string[] {
  return [...SEED_ITEMS];
}

export function loadItems(): LunchItem[] {
  if (typeof window === 'undefined') return seed().map((item) => ({ item }));
  const raw = safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? seed();
  return raw.map((item) => ({ item }));
}

function persist(items: LunchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((it) => it.item)));
  } catch {
    // 隐私模式或磁盘满,静默忽略 —— 内存里依然能用,只是关了就丢
  }
}

export function addItem(item: string): LunchItem[] {
  const trimmed = item.trim();
  if (!trimmed) return loadItems();
  const items = loadItems();
  if (items.some((it) => it.item === trimmed)) return items;
  const next = [...items, { item: trimmed }];
  persist(next);
  return next;
}

export function removeItem(item: string): LunchItem[] {
  const next = loadItems().filter((it) => it.item !== item);
  persist(next);
  return next;
}

export function pickRandom(items: LunchItem[]): LunchItem | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
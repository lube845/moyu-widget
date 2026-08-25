// 本地"饭盒":替代原项目的 /api/lunch 后端,纯 localStorage 持久化。
// 原项目是"公共饭盒",这里改为用户自己的私人饭盒 —— 项目本身不联网,
// 公共饭盒所需的社区协同不在这小组件的能力范围内。

const STORAGE_KEY = 'moyu-lunch-items-v1';

export interface LunchItem {
  id: string;
  item: string;
  name: string;
  createdAt: string;
}

const SEED_ITEMS: Omit<LunchItem, 'id' | 'createdAt'>[] = [
  { item: '老乡鸡', name: '系统种子' },
  { item: '兰州拉面', name: '系统种子' },
  { item: '麦当劳', name: '系统种子' },
  { item: '黄焖鸡米饭', name: '系统种子' },
  { item: '沙县小吃', name: '系统种子' },
  { item: '麻辣烫', name: '系统种子' },
  { item: '饺子', name: '系统种子' },
  { item: '冒菜', name: '系统种子' },
];

function safeParse(raw: string | null): LunchItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LunchItem[]) : null;
  } catch {
    return null;
  }
}

function seed(): LunchItem[] {
  return SEED_ITEMS.map((entry, index) => ({
    ...entry,
    id: `seed-${index}`,
    createdAt: new Date(0).toISOString(),
  }));
}

export function loadItems(): LunchItem[] {
  if (typeof window === 'undefined') return seed();
  return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? seed();
}

export function saveItems(items: LunchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 隐私模式或磁盘满,静默忽略 —— 内存里依然能用,只是关了就丢
  }
}

export function addItem(item: string, name: string): LunchItem {
  const entry: LunchItem = {
    id: crypto.randomUUID(),
    item,
    name,
    createdAt: new Date().toISOString(),
  };
  saveItems([...loadItems(), entry]);
  return entry;
}

export function removeItem(id: string): void {
  saveItems(loadItems().filter((entry) => entry.id !== id));
}

export function pickRandom(): LunchItem | null {
  const items = loadItems();
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

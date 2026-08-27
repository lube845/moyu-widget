import { useRef, useState, type FormEvent } from 'react';
import { addItem, loadItems, pickRandom, removeItem, type LunchItem } from '../lib/lunchItems';

const ROLLING_STEPS = 18;        // 循环步数,模仿转轮减速
const ROLLING_BASE_MS = 45;      // 起步间隔
const ROLLING_STEP_MS = 9;       // 每步递增(减速)

export default function LunchGacha() {
  const [items, setItems] = useState<LunchItem[]>(() => loadItems());
  const [inManage, setInManage] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [settling, setSettling] = useState(false);
  const [displayItem, setDisplayItem] = useState<LunchItem | null>(null);
  const [spinCount, setSpinCount] = useState(0);

  const stepRef = useRef(0);
  const [lastPick, setLastPick] = useState<string | null>(null);

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (items.some((it) => it.item === trimmed)) {
      setNewOption('');
      return;
    }
    setItems(addItem(trimmed));
    setNewOption('');
  };

  const handleDelete = (item: string) => {
    if (items.length <= 1) return; // 至少保留 1 个
    setItems(removeItem(item));
    if (lastPick === item) setLastPick(null);
  };

  // HTML 原型里的 pickRandom:选项 ≥2 时无条件避开上一个,没有重试上限
  const pickAvoidingLast = (): LunchItem => {
    if (items.length === 1) return items[0];
    let choice = pickRandom(items);
    while (choice?.item === lastPick) {
      choice = pickRandom(items);
    }
    return choice!;
  };

  const spin = () => {
    if (spinning || items.length === 0) return;
    setSpinning(true);
    setSettling(false);
    const finalPick = pickAvoidingLast();

    stepRef.current = 0;
    const tick = () => {
      stepRef.current++;
      setDisplayItem(pickRandom(items));
      if (stepRef.current < ROLLING_STEPS) {
        window.setTimeout(tick, ROLLING_BASE_MS + stepRef.current * ROLLING_STEP_MS);
      } else {
        // 落定:跟 HTML 原型一样,先显示 finalPick、加 .settle 类,400ms 后移除
        setDisplayItem(finalPick);
        setSpinning(false);
        setSettling(true);
        setSpinCount((c) => c + 1);
        setLastPick(finalPick.item);
        window.setTimeout(() => setSettling(false), 400);
      }
    };
    tick();
  };

  const resultClass =
    `result-window` +
    (!displayItem && !spinning ? ' idle' : '') +
    (spinning ? ' rolling' : '') +
    (settling ? ' settle' : '');

  const caption =
    inManage
      ? '点 × 删除选项，至少保留 1 个'
      : lastPick
        ? `今天已经扭了 ${spinCount} 次 · 这顿：${lastPick}`
        : '还没扭过，点下面的按钮试试';

  return (
    <section className="lunch-section">
      <header className="lunch-title-row">
        <span className="lunch-title">午餐扭蛋</span>
        <span className="lunch-pool-count">共 {items.length} 个选项</span>
      </header>

      <button
        type="button"
        className="manage-toggle no-drag"
        onClick={() => setInManage((v) => !v)}
        title="管理午餐选项"
      >
        {inManage ? '‹ 返回' : '✎ 管理'}
      </button>

      <div className="divider" />

      {inManage ? (
        <div className="manage-view">
          <div className="chip-list">
            {items.map((it) => (
              <span key={it.item} className="chip">
                <span className="chip-label">{it.item}</span>
                <button
                  type="button"
                  className="chip-del no-drag"
                  disabled={items.length <= 1}
                  onClick={() => handleDelete(it.item)}
                  title={items.length <= 1 ? '至少保留 1 个选项' : '删除'}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form className="add-row" onSubmit={handleAdd}>
            <input
              type="text"
              className="no-drag"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="新选项，比如 沙县小吃"
              maxLength={12}
              aria-label="新选项"
            />
            <button type="submit" className="add-btn no-drag">添加</button>
          </form>
        </div>
      ) : (
        <div className="spin-view">
          <div className={resultClass}>
            {spinning || displayItem ? displayItem?.item : '扭一下试试看'}
          </div>
          <div className="spin-row">
            <button
              type="button"
              className={`spin-btn no-drag${spinning ? ' spinning' : ''}`}
              onClick={spin}
              disabled={items.length === 0}
              aria-label="扭一下"
            >
              扭一下
            </button>
          </div>
        </div>
      )}

      <p className="lunch-caption">{caption}</p>
    </section>
  );
}
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
  const [displayItem, setDisplayItem] = useState<LunchItem | null>(null);
  const [spinCount, setSpinCount] = useState(0);

  const stepRef = useRef(0);
  const lastPickRef = useRef<string | null>(null);

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed) return;
    setItems(addItem(trimmed));
    setNewOption('');
  };

  const handleDelete = (item: string) => {
    if (items.length <= 1) return; // 至少保留 1 个
    setItems(removeItem(item));
    if (lastPickRef.current === item) lastPickRef.current = null;
  };

  const spin = () => {
    if (spinning || items.length === 0) return;
    setSpinning(true);

    // ≥2 个选项时,避免连续两次都扭到同一个
    let pick = pickRandom(items);
    if (items.length >= 2) {
      let tries = 0;
      while (pick?.item === lastPickRef.current && tries < 8) {
        pick = pickRandom(items);
        tries++;
      }
    }
    const finalPick = pick;

    stepRef.current = 0;
    const tick = () => {
      stepRef.current++;
      const random = pickRandom(items);
      setDisplayItem(random);
      if (stepRef.current < ROLLING_STEPS) {
        setTimeout(tick, ROLLING_BASE_MS + stepRef.current * ROLLING_STEP_MS);
      } else {
        setDisplayItem(finalPick);
        setSpinning(false);
        setSpinCount((c) => c + 1);
        if (finalPick) lastPickRef.current = finalPick.item;
      }
    };
    tick();
  };

  return (
    <section className="lunch-section">
      <header className="lunch-title-row">
        <span className="lunch-title">午饭扭蛋</span>
        <div className="title-right">
          <span className="lunch-pool-count">共 {items.length} 选</span>
          <button
            type="button"
            className="manage-toggle no-drag"
            onClick={() => setInManage((v) => !v)}
          >
            {inManage ? '‹ 返回' : '✎ 管理'}
          </button>
        </div>
      </header>

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
              placeholder="新选项，例如 沙县小吃"
              maxLength={12}
              aria-label="新选项"
            />
            <button type="submit" className="add-btn no-drag">添加</button>
          </form>
        </div>
      ) : (
        <div className="spin-view">
          <div
            className={
              `result-window` +
              (!displayItem && !spinning ? ' idle' : '') +
              (spinning ? ' rolling' : '')
            }
          >
            {spinning ? '' : (displayItem?.item || '扭一下试试看')}
          </div>
          <div className="spin-row">
            <button
              type="button"
              className={`spin-btn no-drag${spinning ? ' spinning' : ''}`}
              onClick={spin}
              disabled={items.length === 0}
              aria-label="扭一下"
            >
              {spinning ? '扭动中' : '扭一下'}
            </button>
          </div>
        </div>
      )}

      <p className="lunch-caption">
        {inManage
          ? '点 × 删除选项，至少保留 1 个'
          : spinCount > 0 && displayItem
            ? `今天已扭 ${spinCount} 次 · 这顿：${displayItem.item}`
            : '还没扭过，点下面的按钮试试'}
      </p>
    </section>
  );
}
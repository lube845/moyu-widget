import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { addItem, loadItems, pickRandom, type LunchItem } from '../lib/lunchItems';

const MAX_VISIBLE_CAPSULES = 9;

// 替代原项目的 Notification 弹窗 —— 在小组件里弹窗显得突兀,
// 把反馈合并到一个三秒后自动消失的内联消息区域。
type Flash = { kind: 'success' | 'warning' | 'error'; text: string } | null;

export default function LunchGacha() {
  const [items, setItems] = useState<LunchItem[]>(() => loadItems());
  const [pickedItem, setPickedItem] = useState<LunchItem | null>(null);
  const [itemInput, setItemInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2400);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const visibleCapsules = useMemo(() => items.slice(0, MAX_VISIBLE_CAPSULES), [items]);

  const submitItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const item = itemInput.trim();
    const name = nameInput.trim();
    if (!item || !name) {
      setFlash({ kind: 'warning', text: '还差一点点:饭名和投喂人都要填。' });
      return;
    }
    const entry = addItem(item, name);
    setItems(loadItems());
    setItemInput('');
    setNameInput('');
    setFlash({ kind: 'success', text: `${entry.item} 已放进午饭盒。` });
  };

  const spin = () => {
    if (spinning || items.length === 0) return;
    const picked = pickRandom();
    if (!picked) {
      setFlash({ kind: 'error', text: '扭蛋机卡住了,稍后再扭。' });
      return;
    }
    setSpinning(true);
    setPickedItem(null);
    // 原项目 1.8s,这里稍短,小组件节奏更紧凑
    window.setTimeout(() => {
      setPickedItem(picked);
      setSpinning(false);
    }, 1400);
  };

  return (
    <section className="lunch-section">
      <header className="lunch-title-row">
        <span className="lunch-title">午饭扭蛋机</span>
        <span className="lunch-pool-count">盒内 {items.length} 选</span>
      </header>

      <div className={`lunch-gacha-machine${spinning ? ' shaking' : ''}`} aria-hidden="true">
        <div className="lunch-gacha-dome">
          {visibleCapsules.length === 0 ? (
            <>
              <span className="lunch-capsule capsule-1">🍙</span>
              <span className="lunch-capsule capsule-2">🍜</span>
              <span className="lunch-capsule capsule-3">🍗</span>
            </>
          ) : (
            visibleCapsules.map((entry, index) => (
              <span key={entry.id} className={`lunch-capsule capsule-${(index % 9) + 1}`}>
                {entry.item.slice(0, 3)}
              </span>
            ))
          )}
          <div className="lunch-dome-shine" />
        </div>

        <div className="lunch-machine-body">
          <div className="lunch-machine-label">
            <span>LUNCH</span>
            <strong>午饭盒</strong>
          </div>
          <button
            className="lunch-gacha-knob no-drag"
            type="button"
            disabled={items.length === 0}
            onClick={spin}
            aria-label="扭一下"
          >
            <span>{spinning ? '扭动中' : '扭一下'}</span>
          </button>
          <div className="lunch-gacha-slot">
            <span>{spinning ? '咔哒咔哒…' : '今日饭票出口'}</span>
          </div>
        </div>
        <div className="lunch-machine-feet" />
      </div>

      <div className={`lunch-result${pickedItem ? ' active' : ''}`}>
        {pickedItem ? (
          <>
            <span className="lunch-result-label">今日饭票</span>
            <strong>{pickedItem.item}</strong>
            <p>由 {pickedItem.name} 投喂</p>
          </>
        ) : (
          <p>{items.length === 0 ? '请先往午饭盒里投喂几样饭。' : '扭一下,让命运替你点餐。'}</p>
        )}
      </div>

      {flash && <div className={`lunch-flash lunch-flash--${flash.kind}`}>{flash.text}</div>}

      <form className="lunch-form" onSubmit={submitItem}>
        <input
          className="no-drag"
          value={itemInput}
          maxLength={30}
          placeholder="饭名,例如 老乡鸡"
          aria-label="饭名"
          onChange={(event) => setItemInput(event.target.value)}
        />
        <input
          className="no-drag"
          value={nameInput}
          maxLength={20}
          placeholder="你的名字"
          aria-label="你的名字"
          onChange={(event) => setNameInput(event.target.value)}
        />
        <button type="submit" className="lunch-submit no-drag">
          投喂
        </button>
      </form>
    </section>
  );
}

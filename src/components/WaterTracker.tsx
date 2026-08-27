import { useCallback, useEffect, useRef, useState } from 'react';

const TOTAL = 8;
const ML_PER_CUP = 250;
const STORAGE_KEY = 'moyu-water-tracker-v1';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const loadDrunk = (): number => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const r = JSON.parse(raw) as { date?: string; drunk?: number };
    const n = typeof r.drunk === 'number' ? r.drunk : 0;
    return r.date === todayKey() ? Math.max(0, Math.min(TOTAL, n)) : 0;
  } catch {
    return 0;
  }
};

const persist = (n: number) => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ drunk: n, date: todayKey() })
    );
  } catch {
    // 隐私模式或磁盘满,静默忽略 —— 内存里依然能用
  }
};

type CupState = 'next' | 'undoable' | 'done' | 'locked';

export default function WaterTracker() {
  const [drunk, setDrunkState] = useState(loadDrunk);
  const drunkRef = useRef(drunk);
  drunkRef.current = drunk;

  // 喝一杯时触发的瞬时动画:token 让 cup-shape 的 key 变化以重播 CSS animation
  const [glug, setGlug] = useState<{ idx: number; token: number } | null>(null);

  const update = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(TOTAL, n));
    setDrunkState(clamped);
    persist(clamped);
  }, []);

  // 跨日兜底:① 切回前台时再读一次 storage   ② 排个 setTimeout 到本地 00:00:01 自动清零
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      const fresh = loadDrunk();
      if (fresh !== drunkRef.current) setDrunkState(fresh);
    };
    document.addEventListener('visibilitychange', onVisible);

    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1
      );
      return window.setTimeout(() => {
        update(0);
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    const tid = scheduleMidnight();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(tid);
    };
  }, [update]);

  const cupState = (i: number): CupState => {
    if (i < drunk) return i === drunk - 1 ? 'undoable' : 'done';
    if (i === drunk) return drunk < TOTAL ? 'next' : 'done';
    return 'locked';
  };

  const handleCupClick = (i: number) => {
    const s = cupState(i);
    if (s === 'next') {
      update(drunk + 1);
      // token 用 Date.now() 保证连续点击也能让 cup-shape 的 key 变化,重播 CSS 动画
      setGlug({ idx: i, token: Date.now() });
    } else if (s === 'undoable') {
      update(drunk - 1);
    }
  };

  const ml = drunk * ML_PER_CUP;
  const targetMl = TOTAL * ML_PER_CUP;
  const pct = Math.round((drunk / TOTAL) * 100);
  const remain = TOTAL - drunk;
  const done = drunk >= TOTAL;

  return (
    <section className="water-section">
      <button
        type="button"
        className="water-reset no-drag"
        title="重置今日记录"
        onClick={() => update(0)}
      >
        ↺ 重置
      </button>

      <header className="header">
        <span className="date">今日饮水</span>
        <span
          className="weekday"
          style={done ? { color: '#e08e45' } : undefined}
        >
          {done ? '已达标 🎉' : `目标 ${TOTAL} 杯`}
        </span>
      </header>
      <p className="water-subtitle">
        成人建议每日饮水 1500–2000ml（约 6–8 杯，每杯 250ml）
      </p>

      <div className="divider" />

      <p className="highlight">
        {done ? (
          <>
            今天已经喝够 <b>{TOTAL}</b> 杯水啦，继续保持！
          </>
        ) : (
          <>
            已经喝了 <b>{drunk}</b> 杯，还差 <b>{remain}</b> 杯就达标啦
          </>
        )}
      </p>

      <div className="cups-row">
        {Array.from({ length: TOTAL }, (_, i) => {
          const s = cupState(i);
          const isGlug = glug?.idx === i;
          return (
            <button
              key={i}
              type="button"
              className={`cup state-${s} no-drag${isGlug ? ' drinking' : ''}`}
              onClick={() => handleCupClick(i)}
              disabled={s === 'locked' || s === 'done'}
              aria-label={`第 ${i + 1} 杯`}
            >
              <div
                className="cup-shape"
                // token 变化时强制重挂,这样 .drinking CSS animation 每次都能重放
                key={isGlug ? `glug-${glug!.token}` : 'static'}
              >
                <div className="liquid" />
              </div>
              {isGlug && (
                <span
                  key={`floater-${glug!.token}`}
                  className="floater"
                  aria-hidden
                >
                  +1杯 💧
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="tank-row">
        <span className="tank-label">今日</span>
        <div className="tank-track">
          <div className="tank-fill" style={{ width: `${pct}%` }}>
            <span className="tank-fish" aria-hidden>
              💧
            </span>
          </div>
        </div>
        <span className="tank-percent">{pct}%</span>
      </div>

      <p className="water-caption">
        {done
          ? `太棒了，今日已喝 ${ml}ml，目标已完成！`
          : `已喝 ${ml}ml · 目标 ${targetMl}ml · 点击下一个杯子记录一次饮水`}
      </p>
    </section>
  );
}
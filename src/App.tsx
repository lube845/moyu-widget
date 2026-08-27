import { useCallback, useMemo, useRef, useState, type WheelEvent } from 'react';
import LunchGacha from './components/LunchGacha';
import WaterTracker from './components/WaterTracker';
import { useCalendarSnapshot } from './lib/useCalendarStatus';
import { computeOffworkProgress, computePayrollProgress } from './lib/calendar';

const PAYDAY_STORAGE_KEY = 'moyu-payday-day';
const DEFAULT_PAYDAY = 15;
const OFFWORK_STORAGE_KEY = 'moyu-offwork-time';
const DEFAULT_OFFWORK = { hour: 17, minute: 30 };

interface OffworkTime {
  hour: number;
  minute: number;
}

function usePayday(): readonly [number, (day: number) => void] {
  const [payday, setState] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(PAYDAY_STORAGE_KEY);
      if (!raw) return DEFAULT_PAYDAY;
      const n = parseInt(raw, 10);
      return n >= 1 && n <= 31 ? n : DEFAULT_PAYDAY;
    } catch {
      return DEFAULT_PAYDAY;
    }
  });

  const setPayday = useCallback((day: number) => {
    const clamped = Math.max(1, Math.min(31, Math.floor(day)));
    setState(clamped);
    try {
      window.localStorage.setItem(PAYDAY_STORAGE_KEY, String(clamped));
    } catch {
      // 隐私模式或磁盘满,静默忽略
    }
  }, []);

  return [payday, setPayday] as const;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseHHMM(value: string): OffworkTime | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

function useOffwork(): readonly [OffworkTime, (t: OffworkTime) => void] {
  const [offwork, setState] = useState<OffworkTime>(() => {
    try {
      const raw = window.localStorage.getItem(OFFWORK_STORAGE_KEY);
      if (raw) {
        const parsed = parseHHMM(raw);
        if (parsed) return parsed;
      }
    } catch {
      // 隐私模式或磁盘满,fallback 到默认
    }
    return DEFAULT_OFFWORK;
  });

  const setOffwork = useCallback((t: OffworkTime) => {
    const next = { hour: t.hour, minute: t.minute };
    setState(next);
    try {
      window.localStorage.setItem(
        OFFWORK_STORAGE_KEY,
        `${pad2(next.hour)}:${pad2(next.minute)}`
      );
    } catch {
      // 静默忽略
    }
  }, []);

  return [offwork, setOffwork] as const;
}

const PAGES = [
  { key: 'today', label: '日历' },
  { key: 'water', label: '饮水' },
  { key: 'gacha', label: '扭蛋' },
] as const;

type PageKey = (typeof PAGES)[number]['key'];

/** 把 wheel 节流到 ~300ms 一次 —— 一次拨轮会触发 N 次 wheel,全响应会飞过去 */
const WHEEL_COOLDOWN_MS = 300;

function FishTankBar({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="tank-row">
      <span className="tank-label">{label}</span>
      <div className="tank-track">
        <div className="tank-fill" style={{ width: `${clamped}%` }}>
          <span className="tank-fish" aria-hidden>
            🐟
          </span>
        </div>
      </div>
      <span className="tank-percent">{clamped.toFixed(0)}%</span>
    </div>
  );
}


function PayrollBar({
  payday,
  info,
  onChange,
}: {
  payday: number;
  info: { percent: number };
  onChange: (day: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(payday));

  const startEdit = () => {
    setDraft(String(payday));
    setEditing(true);
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 31) {
      onChange(n);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  return (
    <div className="tank-row payroll-row">
      <span className="tank-label payroll-label">
        {editing ? (
          <input
            className="payday-input no-drag"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            onBlur={commit}
            autoFocus
            aria-label="发工资日期（每月几号）"
          />
        ) : (
          <>
            <span>发工资</span>
            <button
              type="button"
              className="payday-edit-btn no-drag"
              onClick={startEdit}
              title="修改发工资日期"
            >
              {payday}日 ⚙
            </button>
          </>
        )}
      </span>
      <div className="tank-track">
        <div className="tank-fill" style={{ width: `${info.percent}%` }}>
          <span className="tank-fish" aria-hidden>
            💰
          </span>
        </div>
      </div>
      <span className="tank-percent">{info.percent.toFixed(0)}%</span>
    </div>
  );
}


function OffworkBar({
  offwork,
  info,
  onChange,
}: {
  offwork: OffworkTime;
  info: { percent: number; hoursUntilNext: number; minutesUntilNext: number };
  onChange: (t: OffworkTime) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(`${pad2(offwork.hour)}:${pad2(offwork.minute)}`);

  const startEdit = () => {
    setDraft(`${pad2(offwork.hour)}:${pad2(offwork.minute)}`);
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseHHMM(draft);
    if (parsed) onChange(parsed);
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  const hhmm = `${pad2(offwork.hour)}:${pad2(offwork.minute)}`;

  // 倒计时显示:>= 1h 显示「Xh Ym」;< 1h 显示「Y 分钟」
  const countdown =
    info.hoursUntilNext >= 1
      ? `${Math.floor(info.hoursUntilNext)}h ${info.minutesUntilNext % 60}m`
      : `${info.minutesUntilNext} 分钟`;

  return (
    <div className="tank-row payroll-row offwork-row">
      <span className="tank-label payroll-label">
        {editing ? (
          <input
            className="payday-input no-drag"
            type="time"
            value={draft}
            step={300}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            onBlur={commit}
            autoFocus
            aria-label="下班时间"
          />
        ) : (
          <>
            <span>下班</span>
            <button
              type="button"
              className="payday-edit-btn no-drag"
              onClick={startEdit}
              title="修改下班时间"
            >
              {hhmm} ⚙
            </button>
          </>
        )}
      </span>
      <div className="tank-track">
        <div className="tank-fill" style={{ width: `${info.percent}%` }}>
          <span className="tank-fish" aria-hidden>
            💼
          </span>
        </div>
      </div>
      <span className="tank-percent" title={countdown}>
        {info.percent.toFixed(0)}%
      </span>
    </div>
  );
}


function HighlightLine({ status }: { status: ReturnType<typeof useCalendarSnapshot>['status'] }) {
  if (status.isHoliday) {
    const tail = status.nextHoliday.days <= 0 ? '今天是最后一天' : `还剩 ${status.nextHoliday.days} 天`;
    return (
      <p className="highlight">
        🎉 {status.holidayName}假期中 · {tail}
      </p>
    );
  }

  if (status.isRestDay) {
    return (
      <p className="highlight">
        🐟 今天周末，好好摸鱼 · 下个假期「{status.nextHoliday.name}」还有 {status.nextHoliday.days} 天
      </p>
    );
  }

  return (
    <p className="highlight">
      距周五还有 <b>{status.daysToFriday}</b> 天 · 距「{status.nextHoliday.name}」还有{' '}
      <b>{status.nextHoliday.days}</b> 天
    </p>
  );
}

function TodayPage({
  now,
  weekday,
  lunarDate,
  ganzhiYear,
  progress,
  status,
}: ReturnType<typeof useCalendarSnapshot>) {
  const [payday, setPayday] = usePayday();
  const payroll = useMemo(
    () => computePayrollProgress(now, payday),
    [now, payday]
  );
  const [offwork, setOffwork] = useOffwork();
  const offworkInfo = useMemo(
    () => computeOffworkProgress(now, offwork.hour, offwork.minute),
    [now, offwork]
  );
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;
  return (
    <>
      <div className="header">
        <span className="date">{dateLabel}</span>
        <span className="weekday">{weekday}</span>
      </div>
      <div className="lunar">
        {ganzhiYear} · 农历{lunarDate}
      </div>

      <div className="divider" />

      <HighlightLine status={status} />

      <div className="tanks">
        <FishTankBar label="本周" percent={progress.week} />
        <FishTankBar label="本月" percent={progress.month} />
        <FishTankBar label="本年" percent={progress.year} />
        <OffworkBar offwork={offwork} info={offworkInfo} onChange={setOffwork} />
        <PayrollBar payday={payday} info={payroll} onChange={setPayday} />
      </div>
    </>
  );
}

export default function App() {
  const snapshot = useCalendarSnapshot();
  const [pageIndex, setPageIndex] = useState(0);
  const lastWheelRef = useRef(0);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelRef.current < WHEEL_COOLDOWN_MS) return;
    lastWheelRef.current = now;

    setPageIndex((current) => {
      // 向下滚(正向 deltaY)= 下一页,向上滚 = 上一页;到尽头循环
      const step = event.deltaY > 0 ? 1 : -1;
      const next = (current + step + PAGES.length) % PAGES.length;
      return next;
    });
  }, []);

  const currentPage: PageKey = PAGES[pageIndex].key;

  return (
    <div className="card drag-region" onWheel={handleWheel}>
      <div className="page-dots no-drag" aria-hidden>
        {PAGES.map((page, index) => (
          <span key={page.key} className={`page-dot${index === pageIndex ? ' active' : ''}`} />
        ))}
      </div>

      <div className="page-fade" key={currentPage}>
        {currentPage === 'today' && <TodayPage {...snapshot} />}
        {currentPage === 'water' && <WaterTracker />}
        {currentPage === 'gacha' && <LunchGacha />}
      </div>
    </div>
  );
}

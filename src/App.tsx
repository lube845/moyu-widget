import { useCallback, useMemo, useRef, useState, type WheelEvent } from 'react';
import LunchGacha from './components/LunchGacha';
import WaterTracker from './components/WaterTracker';
import { useCalendarSnapshot } from './lib/useCalendarStatus';
import { computePayrollProgress, formatHolidayDate } from './lib/calendar';

const PAYDAY_STORAGE_KEY = 'moyu-payday-day';
const DEFAULT_PAYDAY = 15;

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

declare global {
  interface Window {
    widgetAPI?: {
      close: () => void;
    };
  }
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
        <PayrollBar payday={payday} info={payroll} onChange={setPayday} />
      </div>

      <div className="footer">
        本月工作日 {status.monthlyWorkdays} 天
        {status.isTransferWorkday ? ' · 今天是调休上班日' : ''}
        {` · 下次发工资 ${payroll.nextPayday.getMonth() + 1}月${payroll.nextPayday.getDate()}日（还剩 ${payroll.daysUntilNext} 天）`}
        {status.nextHoliday.start !== status.nextHoliday.end
          ? ` · 「${status.nextHoliday.name}」${formatHolidayDate(status.nextHoliday.start)}–${formatHolidayDate(status.nextHoliday.end)}`
          : ''}
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
      <button
        className="close-btn no-drag"
        title="退出"
        onClick={() => window.widgetAPI?.close()}
      >
        ×
      </button>

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

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import DailyQuote from './components/DailyQuote';
import LunchGacha from './components/LunchGacha';
import NiumaCalendar from './components/NiumaCalendar';
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
  { key: 'almanac', label: '黄历' },
  { key: 'water', label: '饮水' },
  { key: 'gacha', label: '扭蛋' },
  { key: 'quote', label: '一言' },
] as const;

type PageKey = (typeof PAGES)[number]['key'];

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
      <span className="highlight-line">距周五还有 <b>{status.daysToFriday}</b> 天</span>
      <span className="highlight-line">距「{status.nextHoliday.name}」还有 <b>{status.nextHoliday.days}</b> 天</span>
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
        <OffworkBar offwork={offwork} info={offworkInfo} onChange={setOffwork} />
        <PayrollBar payday={payday} info={payroll} onChange={setPayday} />
        <FishTankBar label="本周" percent={progress.week} />
        <FishTankBar label="本月" percent={progress.month} />
        <FishTankBar label="本年" percent={progress.year} />
      </div>
    </>
  );
}

export default function App() {
  const snapshot = useCalendarSnapshot();
  const [pageIndex, setPageIndex] = useState(0);

  // 左右方向翻页,到尽头循环
  const goPage = useCallback((delta: number) => {
    setPageIndex((current) => {
      const next = (current + delta + PAGES.length) % PAGES.length;
      return next;
    });
  }, []);

  // ============ 横向滑动翻页 ============
  // 鼠标按住拖动 / 触控板两指滑动,横向移动超过阈值就翻一页
  const SWIPE_THRESHOLD = 40;          // px
  const WHEEL_COOLDOWN_MS = 300;       // 横向滚轮节流

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    currentX: number;
    active: boolean;
  } | null>(null);

  const lastWheelRef = useRef(0);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // 只响应主键(左键 / 单指触摸)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // 起点在按钮 / 输入框上时让它们自己处理,不抢
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, [contenteditable]')) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      currentX: e.clientX,
      active: true,
    };
    // 捕获指针:拖到卡片外松手也能收到 pointerup,dragRef 不会残留旧状态
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 个别环境不支持时降级为普通行为
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s || !s.active || s.pointerId !== e.pointerId) return;
    s.currentX = e.clientX;
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s || !s.active || s.pointerId !== e.pointerId) return;
    const dx = s.currentX - s.startX;
    dragRef.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    // 向右拖 = 上一页,向左拖 = 下一页
    goPage(dx > 0 ? -1 : 1);
  };

  // 横向滚轮 / 触控板双指横扫 —— 只在 deltaX 为主轴时才响应
  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const dx = event.deltaX;
      const dy = event.deltaY;
      if (dx === 0 || Math.abs(dx) <= Math.abs(dy)) return;
      event.preventDefault();

      const now = performance.now();
      if (now - lastWheelRef.current < WHEEL_COOLDOWN_MS) return;
      lastWheelRef.current = now;

      goPage(dx > 0 ? -1 : 1);
    },
    [goPage]
  );

  const currentPage: PageKey = PAGES[pageIndex].key;

  return (
    <div
      className="card"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={handleWheel}
    >
      {/* 顶部 10px 透明拖动条 —— 给 Electron 用来拖动窗口位置 */}
      <div className="card-drag-strip drag-region" aria-hidden />

      <div className="page-fade" key={currentPage}>
        {currentPage === 'today' && <TodayPage {...snapshot} />}
        {currentPage === 'water' && <WaterTracker />}
        {currentPage === 'gacha' && <LunchGacha />}
        {currentPage === 'quote' && <DailyQuote />}
        {currentPage === 'almanac' && <NiumaCalendar />}
      </div>

      <nav className="page-nav no-drag" aria-label="页面导航">
        <button
          type="button"
          className="page-nav-btn"
          onClick={() => goPage(-1)}
          aria-label="上一页"
          title="向左拖动也可翻到上一页"
        >
          ‹
        </button>
        <div className="page-dots" aria-hidden>
          {PAGES.map((page, index) => (
            <button
              type="button"
              key={page.key}
              className={`page-dot${index === pageIndex ? ' active' : ''}`}
              aria-label={`第 ${index + 1} 页 · ${page.label}`}
              onClick={() => setPageIndex(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="page-nav-btn"
          onClick={() => goPage(1)}
          aria-label="下一页"
          title="向右拖动也可翻到下一页"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

import { useCalendarSnapshot } from './lib/useCalendarStatus';
import { formatHolidayDate } from './lib/calendar';

declare global {
  interface Window {
    widgetAPI?: {
      close: () => void;
    };
  }
}

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

export default function App() {
  const snapshot = useCalendarSnapshot();
  const { now, weekday, lunarDate, ganzhiYear, progress, status } = snapshot;

  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <div className="card drag-region">
      <button
        className="close-btn no-drag"
        title="退出"
        onClick={() => window.widgetAPI?.close()}
      >
        ×
      </button>

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
      </div>

      <div className="footer">
        本月工作日 {status.monthlyWorkdays} 天
        {status.isTransferWorkday ? ' · 今天是调休上班日' : ''}
        {status.nextHoliday.start !== status.nextHoliday.end
          ? ` · 「${status.nextHoliday.name}」${formatHolidayDate(status.nextHoliday.start)}–${formatHolidayDate(status.nextHoliday.end)}`
          : ''}
      </div>
    </div>
  );
}

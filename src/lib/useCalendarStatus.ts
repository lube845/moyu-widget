import { useEffect, useState } from 'react';
import { getGanzhiYear, getLunarDate, getProgress } from './calendar';
import { getCalendarStatus, type CalendarStatus } from './workday';

export interface CalendarSnapshot {
  now: Date;
  weekday: string;
  lunarDate: string;
  ganzhiYear: string;
  progress: ReturnType<typeof getProgress>;
  status: CalendarStatus;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function buildSnapshot(now: Date): CalendarSnapshot {
  return {
    now,
    weekday: WEEKDAYS[now.getDay()],
    lunarDate: getLunarDate(now),
    ganzhiYear: getGanzhiYear(now),
    progress: getProgress(now),
    status: getCalendarStatus(now),
  };
}

/**
 * 每分钟重新计算一次当前的日历状态。所有数据都在本地算出（见 calendar.ts / workday.ts），
 * 不依赖任何网络请求，断网也能正常显示。
 */
export function useCalendarSnapshot(): CalendarSnapshot {
  const [snapshot, setSnapshot] = useState<CalendarSnapshot>(() => buildSnapshot(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot(buildSnapshot(new Date()));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return snapshot;
}

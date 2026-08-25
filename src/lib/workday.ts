import { ADJUSTED_WORKDAYS, HOLIDAY_PERIODS, type HolidayPeriod } from './holidays';

export interface NextHoliday {
  name: string;
  start: string;
  end: string;
  /** 距离当前日期的天数：处于假期中时表示距离假期结束还有几天，否则表示距离假期开始还有几天 */
  days: number;
  /** 今天是否正处于这个假期里 */
  active: boolean;
}

export interface CalendarStatus {
  date: string;
  isWorkday: boolean;
  isRestDay: boolean;
  isHoliday: boolean;
  isTransferWorkday: boolean;
  holidayName: string | null;
  monthlyWorkdays: number;
  daysToFriday: number;
  daysToRestDay: number;
  nextRestDate: string;
  nextHoliday: NextHoliday;
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function findHoliday(key: string): HolidayPeriod | undefined {
  return HOLIDAY_PERIODS.find((h) => key >= h.start && key <= h.end);
}

/** 某一天是否是"休息日"：法定节假日期间，或者是没被调休占用的周六/周日 */
function isRestDayKey(key: string, weekday: number): boolean {
  if (findHoliday(key)) return true;
  const isWeekend = weekday === 0 || weekday === 6;
  if (!isWeekend) return false;
  return !ADJUSTED_WORKDAYS.includes(key);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((atMidnight(b).getTime() - atMidnight(a).getTime()) / 86400000);
}

export function getCalendarStatus(now: Date): CalendarStatus {
  const today = atMidnight(now);
  const key = toKey(today);
  const weekday = today.getDay();

  const holiday = findHoliday(key);
  const isTransferWorkday = ADJUSTED_WORKDAYS.includes(key);
  const isRestDay = isRestDayKey(key, weekday);
  const isWorkday = !isRestDay;

  const daysToFriday = (5 - weekday + 7) % 7;

  let daysToRestDay = 0;
  let nextRestDate = key;
  if (!isRestDay) {
    const cursor = new Date(today);
    for (let i = 1; i <= 60; i += 1) {
      cursor.setDate(cursor.getDate() + 1);
      const cKey = toKey(cursor);
      if (isRestDayKey(cKey, cursor.getDay())) {
        daysToRestDay = i;
        nextRestDate = cKey;
        break;
      }
    }
  }

  let nextHoliday: NextHoliday;
  if (holiday) {
    const end = atMidnight(new Date(`${holiday.end}T00:00:00`));
    nextHoliday = { ...holiday, days: daysBetween(today, end), active: true };
  } else {
    const upcoming = HOLIDAY_PERIODS.find((h) => h.start >= key);
    if (upcoming) {
      const start = atMidnight(new Date(`${upcoming.start}T00:00:00`));
      nextHoliday = { ...upcoming, days: daysBetween(today, start), active: false };
    } else {
      // 内置数据只到今年年底；超出范围时给一个空状态，等明年数据更新后自然恢复。
      nextHoliday = { name: '暂无（待更新次年数据）', start: key, end: key, days: 0, active: false };
    }
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let monthlyWorkdays = 0;
  for (
    let d = new Date(monthStart);
    d.getTime() <= monthEnd.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    if (!isRestDayKey(toKey(d), d.getDay())) monthlyWorkdays += 1;
  }

  return {
    date: key,
    isWorkday,
    isRestDay,
    isHoliday: Boolean(holiday),
    isTransferWorkday,
    holidayName: holiday ? holiday.name : null,
    monthlyWorkdays,
    daysToFriday,
    daysToRestDay,
    nextRestDate,
    nextHoliday,
  };
}

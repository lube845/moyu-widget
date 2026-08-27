// 农历、干支纪年靠浏览器内置的 Intl.DateTimeFormat('zh-CN-u-ca-chinese') 计算，
// 时间进度条靠本地时间计算，两者都不依赖任何后端接口。

function atLocalMidnight(value: Date | string): Date {
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value * 100));
}

export function getProgress(now: Date) {
  const weekDay = now.getDay() === 0 ? 7 : now.getDay();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - (weekDay - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  return {
    week: clampPercent((now.getTime() - weekStart.getTime()) / (weekEnd.getTime() - weekStart.getTime())),
    month: clampPercent((now.getTime() - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())),
    year: clampPercent((now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())),
  };
}

export function getLunarDate(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric',
    }).formatToParts(date);
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = Number(parts.find((part) => part.type === 'day')?.value);
    const dayNames = [
      '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
    ];
    return `${month}${dayNames[day] ?? day}`;
  } catch {
    return '农历日期';
  }
}

export function getGanzhiYear(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric',
    }).formatToParts(date);
    const lunarYear = Number(parts.find((part) => String(part.type) === 'relatedYear')?.value);
    if (!Number.isFinite(lunarYear)) throw new Error('Invalid lunar year');

    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    const stemIndex = (lunarYear - 4) % stems.length;
    const branchIndex = (lunarYear - 4) % branches.length;

    return `${stems[stemIndex]}${branches[branchIndex]}${zodiacs[branchIndex]}年`;
  } catch {
    return '农历纪年';
  }
}

export function formatHolidayDate(date: string): string {
  const target = atLocalMidnight(date);
  return `${target.getMonth() + 1}月${target.getDate()}日`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 距下次发工资的进度(0% = 刚发, 100% = 今天/明天发),clamp 到 0–100 */
export function computePayrollProgress(now: Date, dayOfMonth: number) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = new Date(year, month, now.getDate()).getTime();

  const thisMonthPayday = new Date(
    year,
    month,
    Math.min(dayOfMonth, daysInMonth(year, month))
  ).getTime();
  const nextMonthPayday = new Date(
    year,
    month + 1,
    Math.min(dayOfMonth, daysInMonth(year, month + 1))
  ).getTime();
  const prevMonthPayday = new Date(
    year,
    month - 1,
    Math.min(dayOfMonth, daysInMonth(year, month - 1))
  ).getTime();

  let lastPayday: number;
  let nextPayday: number;
  if (today < thisMonthPayday) {
    nextPayday = thisMonthPayday;
    lastPayday = prevMonthPayday;
  } else {
    nextPayday = nextMonthPayday;
    lastPayday = thisMonthPayday;
  }

  const totalPeriod = nextPayday - lastPayday;
  const daysSinceLast = today - lastPayday;
  const daysUntilNext = nextPayday - today;
  const rawPercent = totalPeriod > 0 ? (daysSinceLast / totalPeriod) * 100 : 0;

  return {
    percent: Math.max(0, Math.min(100, rawPercent)),
    daysSinceLast: Math.round(daysSinceLast / 86400000),
    daysUntilNext: Math.round(daysUntilNext / 86400000),
    totalDays: Math.round(totalPeriod / 86400000),
    nextPayday: new Date(nextPayday),
  };
}

/** 距下次下班的进度(0% = 刚下班, 100% = 即将下班),24 小时一周期 */
export function computeOffworkProgress(now: Date, hour: number, minute: number) {
  const todayOffwork = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute
  ).getTime();
  const tomorrowOffwork = todayOffwork + 86400000;
  const yesterdayOffwork = todayOffwork - 86400000;

  let lastOffwork: number;
  let nextOffwork: number;
  if (now.getTime() < todayOffwork) {
    nextOffwork = todayOffwork;
    lastOffwork = yesterdayOffwork;
  } else {
    nextOffwork = tomorrowOffwork;
    lastOffwork = todayOffwork;
  }

  const totalPeriod = nextOffwork - lastOffwork; // 恒为 86400000
  const msSinceLast = now.getTime() - lastOffwork;
  const msUntilNext = nextOffwork - now.getTime();
  const rawPercent = totalPeriod > 0 ? (msSinceLast / totalPeriod) * 100 : 0;

  return {
    percent: Math.max(0, Math.min(100, rawPercent)),
    minutesUntilNext: Math.round(msUntilNext / 60000),
    hoursUntilNext: msUntilNext / 3600000,
    nextOffwork: new Date(nextOffwork),
  };
}

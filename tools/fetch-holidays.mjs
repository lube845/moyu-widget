#!/usr/bin/env node
// 从 timor.tech/api/holiday 拉取指定年份的法定节假日和调休数据，
// 输出与 parse-holidays.mjs 相同格式的 TS 代码片段，可直接粘贴到 holidays.ts。
//
// 用法:
//   node tools/fetch-holidays.mjs 2026                  # 拉取并打印
//   node tools/fetch-holidays.mjs 2027 > out.txt        # 重定向到文件
//   node tools/fetch-holidays.mjs --self-test           # 跑内置断言，无需联网

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const yearArg = process.argv.find((a) => /^\d{4}$/.test(a));
if (!yearArg) {
  console.error('用法: node tools/fetch-holidays.mjs <年份>');
  console.error('      （加 --self-test 跑内置断言，无需联网）');
  process.exit(1);
}
const year = +yearArg;

let data;
try {
  const res = await fetch(`https://timor.tech/api/holiday/year/${year}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) {
    console.error(`请求失败: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  data = await res.json();
} catch (e) {
  console.error('网络错误:', e.message);
  process.exit(1);
}

if (data.code !== 0) {
  console.error('API 返回错误:', JSON.stringify(data));
  process.exit(1);
}

const result = parseTimor(data.holiday, year);
if (result.periods.length === 0) {
  console.error('未解析到任何假期，API 返回数据可能为空或格式有变，请人工核对。');
  process.exit(1);
}

printTs(year, result);

// ---------- parser ----------

function parseTimor(holidayMap, _year) {
  // holidayMap: { "01-01": { holiday: true, name: "元旦", date: "2026-01-01", ... }, ... }
  //
  // 假期段：连续的 holiday=true 日合并成一个段，名称取首日
  // （春节会出现 02-15=春节, 02-16=除夕, 02-17=初一...，首日名 "春节" 正好对）
  const holidayDates = Object.values(holidayMap)
    .filter((e) => e.holiday)
    .map((e) => e.date)
    .sort();

  const periods = [];
  if (holidayDates.length > 0) {
    let start = holidayDates[0];
    let end = holidayDates[0];
    let name = nameFor(holidayMap, start);

    for (let i = 1; i < holidayDates.length; i++) {
      const diff = (new Date(holidayDates[i]) - new Date(end)) / 86400000;
      if (diff === 1) {
        end = holidayDates[i];
      } else {
        periods.push({ name, start, end });
        start = holidayDates[i];
        end = holidayDates[i];
        name = nameFor(holidayMap, start);
      }
    }
    periods.push({ name, start, end });
  }

  // 调休上班日：holiday=false 且有 target 字段
  const adjustedWorkdays = Object.values(holidayMap)
    .filter((e) => !e.holiday && e.target)
    .map((e) => e.date)
    .sort();

  return { periods, adjustedWorkdays };
}

function nameFor(holidayMap, dateStr) {
  return Object.values(holidayMap).find((e) => e.date === dateStr)?.name ?? '';
}

function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function weekdayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return '日一二三四五六'[d.getDay()];
}

function printTs(year, { periods, adjustedWorkdays }) {
  console.log(`// ${year} 年节假日数据（来源 timor.tech API，请人工核对日期与名称）`);
  console.log();
  console.log('HOLIDAY_PERIODS 追加：');
  for (const p of periods) {
    console.log(
      `  { name: '${p.name}', start: '${p.start}', end: '${p.end}' }, // ${weekdayLabel(p.start)}–${weekdayLabel(p.end)}`,
    );
  }
  console.log();
  console.log('ADJUSTED_WORKDAYS 追加：');
  for (const d of adjustedWorkdays) {
    console.log(`  '${d}', // ${weekdayLabel(d)}`);
  }
  console.log();
  console.log(`// 共 ${periods.length} 个假期，${adjustedWorkdays.length} 个调休上班日`);
}

function runSelfTest() {
  // 最小 fixture：测单日假期、多日同名假期、跨日不同名假期（春节场景）、调休上班日
  const fixture = {
    '01-01': { holiday: true, name: '元旦', date: '2026-01-01' },
    '01-02': { holiday: true, name: '元旦', date: '2026-01-02' },
    '01-04': { holiday: false, name: '元旦后补班', target: '元旦', date: '2026-01-04' },
    '02-14': { holiday: false, name: '春节前补班', target: '春节', date: '2026-02-14' },
    '02-15': { holiday: true, name: '春节', date: '2026-02-15' },
    '02-16': { holiday: true, name: '除夕', date: '2026-02-16' },
    '02-17': { holiday: true, name: '初一', date: '2026-02-17' },
    '02-18': { holiday: true, name: '初二', date: '2026-02-18' },
  };

  const r = parseTimor(fixture, 2026);
  const expP = [
    { name: '元旦', start: '2026-01-01', end: '2026-01-02' },
    { name: '春节', start: '2026-02-15', end: '2026-02-18' },
  ];
  const expW = ['2026-01-04', '2026-02-14'];

  const gotP = JSON.stringify(r.periods);
  const expPS = JSON.stringify(expP);
  const gotW = JSON.stringify(r.adjustedWorkdays);
  const expWS = JSON.stringify(expW);

  if (gotP !== expPS) {
    console.error('FAIL periods\n  got:', gotP, '\n  exp:', expPS);
    process.exit(1);
  }
  if (gotW !== expWS) {
    console.error('FAIL workdays\n  got:', gotW, '\n  exp:', expWS);
    process.exit(1);
  }
  console.log(
    `self-test passed: ${r.periods.length} periods, ${r.adjustedWorkdays.length} workdays`,
  );
  process.exit(0);
}

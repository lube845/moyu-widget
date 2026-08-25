#!/usr/bin/env node
// 解析《国务院办公厅关于 XXXX 年部分节假日安排的通知》格式文本，
// 输出可直接粘贴到 src/lib/holidays.ts 的两段 TS 数组。
//
// 用法:
//   node tools/parse-holidays.mjs <年份> [--file <路径>]
//   node tools/parse-holidays.mjs 2026                  # 从 stdin 读取
//   node tools/parse-holidays.mjs 2026 --file notice.txt
//   node tools/parse-holidays.mjs --self-test           # 跑内置断言

import { readFileSync } from 'node:fs';

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const yearArg = process.argv.find((a) => /^\d{4}$/.test(a));
if (!yearArg) {
  console.error('用法: node tools/parse-holidays.mjs <年份> [--file <路径>]');
  console.error('      （无 --file 则从 stdin 读取；加 --self-test 跑内置断言）');
  process.exit(1);
}
const year = +yearArg;

const fileIdx = process.argv.indexOf('--file');
let text;
try {
  text =
    fileIdx >= 0
      ? readFileSync(process.argv[fileIdx + 1], 'utf-8')
      : readFileSync(0, 'utf-8');
} catch (e) {
  console.error('读取失败:', e.message);
  process.exit(1);
}

if (!text.trim()) {
  console.error('输入为空');
  process.exit(1);
}

const result = parseNotice(text, year);

if (result.periods.length === 0) {
  console.error('未解析到任何假期，请检查输入文本格式是否匹配（"一、名称：...放假..."）。');
  process.exit(1);
}

printTs(year, result);

// ---------- parser ----------

function parseNotice(text, year) {
  // 一段一行：每行形如 "一、元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。"
  // 按行拆分避免段内 "二十八、" 之类的字符误触发下一段边界。
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const periods = [];
  const adjustedWorkdays = [];

  for (const line of lines) {
    const header = line.match(/^[一二三四五六七八九十]+、(.+?)[：:](.*)$/);
    if (!header) continue;
    const name = header[1].trim();
    const body = header[2];

    // 放假区间：X月Y日（...）至[Z月]W日（...）放假[调休][，共N天]
    const pm = body.match(
      /(\d+)\s*月\s*(\d+)\s*日\s*（[^）]+）\s*至\s*(?:(\d+)\s*月\s*)?(\d+)\s*日\s*（[^）]+）\s*放假\s*(?:调休)?\s*(?:[,,]\s*共\s*\d+\s*天)?/,
    );
    if (pm) {
      const sm = +pm[1];
      const sd = +pm[2];
      const em = pm[3] ? +pm[3] : sm;
      const ed = +pm[4];
      periods.push({
        name,
        start: fmt(year, sm, sd),
        end: fmt(year, em, ed),
      });
    }

    // 调休上班日：可能多个 "X月Y日（...）" 用 、/， 连接，最后一个以 "上班" 结尾
    const wcm = body.match(
      /((?:\d+\s*月\s*\d+\s*日\s*（[^）]+）[、，]\s*)*\d+\s*月\s*\d+\s*日\s*（[^）]+）\s*上班)/,
    );
    if (wcm) {
      const dates = [...wcm[1].matchAll(/(\d+)\s*月\s*(\d+)\s*日/g)];
      for (const dm of dates) {
        adjustedWorkdays.push(fmt(year, +dm[1], +dm[2]));
      }
    }
  }

  return { periods, adjustedWorkdays };
}

function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function weekdayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return '日一二三四五六'[d.getDay()];
}

function printTs(year, { periods, adjustedWorkdays }) {
  console.log(`// ${year} 年节假日数据（自动解析自通知文本，请人工核对日期与星期）`);
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
  const fixture = [
    '一、元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。',
    '二、春节：2月15日（农历腊月二十八、周日）至23日（农历正月初七、周一）放假调休，共9天。2月14日（周六）、2月28日（周六）上班。',
    '三、清明节：4月4日（周六）至6日（周一）放假，共3天。',
    '四、劳动节：5月1日（周五）至5日（周二）放假调休，共5天。5月9日（周六）上班。',
    '五、端午节：6月19日（周五）至21日（周日）放假，共3天。',
    '六、中秋节：9月25日（周五）至27日（周日）放假，共3天。',
    '七、国庆节：10月1日（周四）至7日（周三）放假调休，共7天。9月20日（周日）、10月10日（周六）上班。',
  ].join('\n');

  const r = parseNotice(fixture, 2026);
  const expP = [
    { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
    { name: '春节', start: '2026-02-15', end: '2026-02-23' },
    { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
    { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
    { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
    { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
    { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
  ];
  const expW = [
    '2026-01-04',
    '2026-02-14',
    '2026-02-28',
    '2026-05-09',
    '2026-09-20',
    '2026-10-10',
  ];

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

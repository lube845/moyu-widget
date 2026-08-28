// 牛马黄历 —— 打工人专属每日一签。
// 以当天日期为种子跑伪随机:同一天内结果固定,跨天自动换签。
// 全程本地计算,零网络请求。

/** 宜忌成对出现:抽中一条,宜显示 good、忌显示 bad,语义天然呼应 */
interface AlmanacEntry {
  good: string;
  bad: string;
}

const ENTRIES: AlmanacEntry[] = [
  { good: '准点下班', bad: '主动加班' },
  { good: '带薪如厕', bad: '憋尿改稿' },
  { good: '装忙', bad: '真干活' },
  { good: '写周报', bad: '写 OKR' },
  { good: '甩锅', bad: '背锅' },
  { good: '抢红包', bad: '发红包' },
  { good: '摸鱼刷剧', bad: '盯工作群' },
  { good: '拒绝画饼', bad: '吞下大饼' },
  { good: '踩点打卡', bad: '提前到岗' },
  { good: '假装在开会', bad: '真的在开会' },
  { good: '评审会装睡', bad: '主动认领需求' },
  { good: '奶茶续命', bad: '咖啡续命' },
  { good: '群里发表情', bad: '群里发长文' },
  { good: '已读不回', bad: '秒回老板' },
  { good: '求助老同事', bad: '硬扛到底' },
  { good: '抱团吐槽', bad: '独自 emo' },
  { good: '带薪充电', bad: '自费内卷' },
  { good: '给绿植浇水', bad: '给老板朋友圈点赞' },
  { good: '拒绝无效会议', bad: '组织无效会议' },
  { good: '准时吃午饭', bad: '边开会边吃冷饭' },
  { good: '下班关机', bad: '带电脑回家' },
  { good: '假装信号不好', bad: '视频会开摄像头' },
  { good: '群消息免打扰', bad: '置顶工作群' },
  { good: '工位囤零食', bad: '请全组喝奶茶' },
  { good: '把锅写成文档', bad: '口头接锅' },
  { good: '周五请假', bad: '周一述职' },
  { good: '模板一把梭', bad: '从零憋方案' },
  { good: '中午眯一觉', bad: '中午赶 PPT' },
  { good: '月底清年假', bad: '年底清零年假' },
  { good: '带薪挂号看病', bad: '带病坚持上岗' },
];

const DRINKS: string[] = [
  '冰美式',
  '枸杞泡水',
  '三分糖奶茶',
  '公司免费咖啡',
  '手冲豆浆',
  '续命可乐',
  '蜂蜜柠檬水',
  '东方树叶',
  '速溶三合一',
  '免费桶装水',
];

const DIRECTIONS: string[] = [
  '坐北朝南',
  '背靠承重墙',
  '面朝老板看不见的角落',
  '紧邻逃生通道',
  '远离打印机三米',
  '正对空调出风口',
  '背对老板工位',
  '紧挨零食补给站',
  '摄像头盲区',
  '靠窗摸鱼专座',
];

const FORTUNES: string[] = [
  '命里有时终须有，命里无时莫强求',
  '牛马一生，全靠演技',
  '今日之锅，不必今日背',
  '摸鱼是福，内卷是祸',
  '领导画的饼，不如食堂的饼',
  '上班如戏，全凭演技',
  '天将降大饼于斯人也，必先苦其心志',
  '工资按量，工作量力而行',
  '只要我不尴尬，尴尬的就是老板',
  '会哭的孩子有奶吃，会演的牛马有假休',
  '工作是干不完的，命是自己的',
  '你卷任你卷，我到点下班',
  '忍一时风平浪静，退一步准点下班',
  '大饼虽好，可不要贪杯',
];

export interface NiumaAlmanac {
  /** 宜 2 条 */
  good: [string, string];
  /** 忌 2 条(与宜同源的反面) */
  bad: [string, string];
  /** 今日宜饮 */
  drink: string;
  /** 工位朝向 */
  direction: string;
  /** 牛马指数 1–5 */
  stars: number;
  /** 底部签文 */
  fortune: string;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates 洗牌,用传入的 rand 保证同一天结果可复现 */
function shuffled<T>(arr: readonly T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getNiumaAlmanac(date: Date): NiumaAlmanac {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const rand = mulberry32(hashSeed(`niuma-${key}`));

  const picks = shuffled(ENTRIES, rand);
  const drinks = shuffled(DRINKS, rand);
  const dirs = shuffled(DIRECTIONS, rand);
  const fortunes = shuffled(FORTUNES, rand);

  return {
    good: [picks[0].good, picks[1].good],
    bad: [picks[0].bad, picks[1].bad],
    drink: drinks[0],
    direction: dirs[0],
    stars: 1 + Math.floor(rand() * 5),
    fortune: fortunes[0],
  };
}

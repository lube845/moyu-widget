import { useCallback, useEffect, useRef, useState } from 'react';

interface Quote {
  hitokoto: string;
  from?: string;
  from_who?: string | null;
}

const API_URL = 'https://v1.hitokoto.cn/?c=d&c=i';

const FALLBACK_QUOTES: Quote[] = [
  { hitokoto: '纸上得来终觉浅，绝知此事要躬行。', from: '冬夜读书示子聿', from_who: '陆游' },
  { hitokoto: '山重水复疑无路，柳暗花明又一村。', from: '游山西村', from_who: '陆游' },
  { hitokoto: '大鹏一日同风起，扶摇直上九万里。', from: '上李邕', from_who: '李白' },
  { hitokoto: '天行健，君子以自强不息。', from: '周易', from_who: null },
  { hitokoto: '路漫漫其修远兮，吾将上下而求索。', from: '离骚', from_who: '屈原' },
  { hitokoto: '会当凌绝顶，一览众山小。', from: '望岳', from_who: '杜甫' },
];

const STORAGE_KEY = 'moyu-quote-of-day';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

interface StoredPayload {
  date: string;
  quote: Quote;
}

const loadTodayQuote = (): Quote | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    return parsed.date === todayKey() ? parsed.quote : null;
  } catch {
    return null;
  }
};

const persist = (quote: Quote) => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ quote, date: todayKey() })
    );
  } catch {
    // 静默忽略
  }
};

export default function DailyQuote() {
  const [quote, setQuote] = useState<Quote | null>(() => loadTodayQuote());
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [count, setCount] = useState(0);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const fetchQuote = useCallback(async () => {
    if (loadingRef.current) return;
    setLoading(true);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(API_URL, { signal: controller.signal });
      if (!res.ok) throw new Error('bad response');
      const data = (await res.json()) as Quote;
      setQuote(data);
      setOffline(false);
      persist(data);
    } catch {
      const fallback =
        FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      setQuote(fallback);
      setOffline(true);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
      setCount((c) => c + 1);
    }
  }, []);

  useEffect(() => {
    if (!quote) {
      fetchQuote();
    }
  }, [quote, fetchQuote]);

  const fitFontSize = (len: number): string => {
    if (len <= 12) return '20px';
    if (len <= 20) return '17px';
    if (len <= 36) return '14.5px';
    return '12.5px';
  };

  /** 按中文逗号/句号/问号/叹号/分号分行 —— 标点本身保留在段尾 */
  const splitLines = (s: string): string[] => {
    const parts = s.split(/(?<=[，。？；！？])/u);
    // 过滤掉空段(连续标点时可能出现)
    return parts.filter((p) => p.length > 0);
  };

  const buildAttr = (q: Quote): string => {
    const parts: string[] = [];
    if (q.from_who) parts.push(q.from_who);
    if (q.from) parts.push(`《${q.from}》`);
    return parts.length ? '—— ' + parts.join(' ') : '—— 一言';
  };

  const showPlaceholder = !quote;
  const text = quote?.hitokoto ?? '正在获取今日一言…';
  const attr = quote ? buildAttr(quote) : '';

  const caption = offline
    ? `已经换了 ${count} 句 · 网络不给力，先看本地例句`
    : count > 0
      ? `已经换了 ${count} 句`
      : '首次加载中';

  return (
    <section className="quote-section">
      <h1 className="quote-title">
        每日一言
        <span className="quote-tag">文学 · 诗词</span>
      </h1>

      <p className="quote-subtitle">来自一言网 · 点击句子换一句</p>

      <div className="divider" />

      <div className="quote-area">
        <span className="quote-mark" aria-hidden>
          “
        </span>
        <button
          type="button"
          className={
            'quote-text' +
            (showPlaceholder ? ' placeholder' : '') +
            (loading ? ' loading' : '')
          }
          style={
            quote
              ? { fontSize: fitFontSize(quote.hitokoto.length) }
              : undefined
          }
          onClick={fetchQuote}
          disabled={loading}
          title="换一句"
          aria-label="换一句"
        >
          {showPlaceholder
            ? text
            : splitLines(text).map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
        </button>
        {attr && <p className="quote-attr">{attr}</p>}
      </div>

      <p className="quote-caption">{caption}</p>
    </section>
  );
}
import { useMemo } from 'react';
import { getLunarDate } from '../lib/calendar';
import { getNiumaAlmanac } from '../lib/niumaAlmanac';

export default function NiumaCalendar() {
  // 每天固定一签:挂载时按当天日期算一次,同日多次打开结果一致
  const almanac = useMemo(() => getNiumaAlmanac(new Date()), []);
  const lunar = useMemo(() => getLunarDate(new Date()), []);

  return (
    <section className="almanac-section">
      <header className="header">
        <span className="date">牛马黄历</span>
        <span className="weekday">农历{lunar}</span>
      </header>

      <div className="divider" />

      <div className="almanac-main">
        <div className="almanac-row">
          <span className="almanac-tag tag-good">宜</span>
          <span className="almanac-items">
            {almanac.good.map((item) => (
              <span key={item} className="almanac-item good">
                {item}
              </span>
            ))}
          </span>
        </div>
        <div className="almanac-row">
          <span className="almanac-tag tag-bad">忌</span>
          <span className="almanac-items">
            {almanac.bad.map((item) => (
              <span key={item} className="almanac-item bad">
                {item}
              </span>
            ))}
          </span>
        </div>

        <div className="almanac-extras">
          <p>
            今日宜饮 <b>{almanac.drink}</b>
          </p>
          <p>
            工位朝向 <b>{almanac.direction}</b>
          </p>
          <p>
            牛马指数{' '}
            <b className="almanac-stars">
              {'★'.repeat(almanac.stars)}
              {'☆'.repeat(5 - almanac.stars)}
            </b>
          </p>
        </div>
      </div>

      <p className="almanac-caption">签文：{almanac.fortune}</p>
    </section>
  );
}

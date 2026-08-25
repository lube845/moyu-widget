# 摸鱼日历 · 桌面小组件

基于 [AKAama/moyu-calendar](https://github.com/AKAama/moyu-calendar) 抽卡片重做的 Windows
桌面小组件：无边框、置顶、可拖动，展示日期/农历/干支纪年、距周五和下个法定节假日还有几天，
以及本周/本月/本年的"鱼缸"风格进度条。

**和原网站的区别**：原网站的节假日数据由它自己的独立后端 `GET /api/calendar` 提供；这个小组件
把节假日数据改成本地内置（见下方"更新下一年节假日数据"），不再依赖任何服务器，断网也能用。
农历、干支纪年、进度条的计算逻辑和原项目完全一致（浏览器原生 `Intl` API + 本地时间计算）。
摸鱼 bingo 小游戏、疯狂星期四文案、留言区、分享图片等和"卡片"本身无关的功能没有搬过来。

## 1. 安装依赖

```powershell
npm install
```

## 2. 本地开发（带热重载）

```powershell
npm run dev
```

会同时启动 Vite 开发服务器和 Electron 窗口，改代码会自动刷新。

## 3. 打包成 Windows 安装包

```powershell
npm run build
```

产物在 `release/` 目录下，是一个 NSIS 安装包（`.exe`），双击安装后即可在开始菜单里找到
"摸鱼日历"。也可以只运行 `npm run build:renderer` 生成网页产物，自己用别的方式打包。

## 4. 使用方式

- **拖动**：左键按住卡片任意位置即可拖动，位置会自动保存，下次打开还在原处
- **右键菜单**：可以切换「始终置顶」「开机自启动」，或者「退出」
- **关闭按钮**：鼠标悬停在卡片上，右上角会出现一个小的 `×`

## 5. 更新下一年节假日数据

每年 11 月前后，国务院办公厅会发布下一年度的节假日安排。两种方式任选其一，
生成同样的两段 TS 代码，粘贴进 `src/lib/holidays.ts` 对应的两个数组即可，
不需要改任何计算逻辑（`workday.ts` 是纯根据这两份数据算的）。

### 方式 A：从第三方 API 拉（最快）

```powershell
npm run fetch-holidays -- 2027
```

底层走 `https://timor.tech/api/holiday/year/{year}`（免费、无需 key）。
无需联网自检：`npm run fetch-holidays -- --self-test`。

### 方式 B：粘贴国务院通知原文（最权威）

把通知原文保存成文件或复制到剪贴板：

```powershell
# 从文件
npm run parse-holidays -- 2027 < notice-2027.txt
# 从剪贴板
Get-Clipboard | npm run parse-holidays -- 2027
```

支持的通知格式举例：

```
一、元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。
二、春节：2月15日（农历腊月二十八、周日）至23日（农历正月初七、周一）放假调休，共9天。2月14日（周六）、2月28日（周六）上班。
...
```

无需联网自检：`npm run parse-holidays -- --self-test`。

### 两种方式输出都一样

```ts
HOLIDAY_PERIODS 追加：
  { name: '元旦', start: '2027-01-01', end: '2027-01-03' }, // 五–日
  ...
ADJUSTED_WORKDAYS 追加：
  '2027-01-04', // 一
  ...
```

每行末尾的星期注释是工具自动算的，对照原文能一眼看出有没有解析错。
贴完之后把 `holidays.ts` 顶部注释里的数据来源年份改成新一年即可。

## 6. 项目结构

```
electron/
├── main.js       # 主进程：创建无边框透明窗口、记住位置、右键菜单
└── preload.js     # 预加载脚本：暴露一个安全的"关闭"接口给页面
src/
├── App.tsx                  # 卡片 UI
├── styles.css                # 卡片样式（鱼缸进度条在这里）
├── main.tsx                  # React 渲染入口
└── lib/
     ├── calendar.ts            # 农历/干支纪年/时间进度计算（和原项目一致）
     ├── holidays.ts             # 内置节假日数据（每年用 parse/fetch-holidays 更新）
     ├── workday.ts              # 根据 holidays.ts 算出今天是否上班/休息/调休等
     └── useCalendarStatus.ts    # 每分钟刷新一次上面这些数据的 React hook
tools/
├── parse-holidays.mjs       # 解析国务院通知文本 → holidays.ts 代码片段
└── fetch-holidays.mjs       # 从 timor.tech API 拉数据 → holidays.ts 代码片段
```

## 7. 想换回原版视觉风格？

原项目用的是 [animal-island-ui](https://www.npmjs.com/package/animal-island-ui)
组件库（CC-BY-NC-4.0，仅限非商业使用）。这个小组件为了保持依赖轻量，样式是手写的
CSS（暖白卡片 + 抹茶绿/杏橙点缀），配色和布局都在 `src/styles.css` 里，可以直接改；
如果想要更接近原网站的"动物森友会"风格，也可以自己 `npm install animal-island-ui`
后在 `App.tsx` 里换用它的 `Card` / `Progress` / `Tag` 组件。

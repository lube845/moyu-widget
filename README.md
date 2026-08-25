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

每年 11 月前后，国务院办公厅会发布下一年度的节假日安排。到时候打开
`src/lib/holidays.ts`，往 `HOLIDAY_PERIODS`（放假区间）和 `ADJUSTED_WORKDAYS`
（调休上班的周末）两个数组里追加新一年的数据即可，不需要改任何计算逻辑
（`src/lib/workday.ts` 是纯根据这两份数据算的）。

2026 年的数据来源：国务院办公厅《关于2026年部分节假日安排的通知》
（2025年11月4日发布）。

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
    ├── holidays.ts             # 内置节假日数据（每年手动更新一次）
    ├── workday.ts              # 根据 holidays.ts 算出今天是否上班/休息/调休等
    └── useCalendarStatus.ts    # 每分钟刷新一次上面这些数据的 React hook
```

## 7. 想换回原版视觉风格？

原项目用的是 [animal-island-ui](https://www.npmjs.com/package/animal-island-ui)
组件库（CC-BY-NC-4.0，仅限非商业使用）。这个小组件为了保持依赖轻量，样式是手写的
CSS（暖白卡片 + 抹茶绿/杏橙点缀），配色和布局都在 `src/styles.css` 里，可以直接改；
如果想要更接近原网站的"动物森友会"风格，也可以自己 `npm install animal-island-ui`
后在 `App.tsx` 里换用它的 `Card` / `Progress` / `Tag` 组件。

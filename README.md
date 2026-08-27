# 摸鱼小组件 · Windows 桌面置顶小组件

无边框、置顶、可拖动的 Windows 桌面小组件。鼠标滚轮翻页，三个页面：

- **日历** — 今天的日期、农历干支纪年、距周五和下个法定节假日还有几天、本周/本月/本年鱼缸进度条（绿色），下班进度条（橙色），发工资进度条（金色）
- **饮水** — 8 杯目标，按天自动重置；可视化杯子进度条
- **扭蛋** — 午饭扭蛋机，自定义选项库，spin / manage 两视图

暖白卡片 + 抹茶绿 / 杏橙点缀；离线可用（节假日内置），不依赖任何后端。

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

产物在 `release/` 目录下，是一个 NSIS 安装包（`.exe`），双击安装后即可在开始菜单里找到"摸鱼小组件"。也可以只运行 `npm run build:renderer` 生成网页产物，自己用别的方式打包。

## 4. 使用方式

- **拖动**：左键按住卡片任意位置即可拖动，位置会自动保存，下次打开还在原处
- **滚轮翻页**：鼠标悬停在卡片上，向下 / 向上滚动滚轮即可在 日历 → 饮水 → 扭蛋 间循环切换
- **右键菜单**：可以切换「始终置顶」「开机自启动」，或者「退出」

## 5. 页面说明

### 日历页（默认 / 第 1 页）

- 当前日期（大号数字标题）+ 星期
- 农历、干支纪年
- 距周五还有几天 / 距下一个法定节假日还有几天
- 五个鱼缸风格进度条：`本周` / `本月` / `本年`（绿色，带 🐟）、`下班`（橙色，带 💼，可编辑默认 17:30）、`发工资`（金色，带 💰，可编辑每月几日）

### 饮水页（第 2 页）

- 8 个杯子按钮横排，点击满杯（蓝色脉冲的那个）记录一次饮水，喝掉后杯子变空
- 点击刚喝的那一杯可以撤销
- 顶部右侧 `↺ 重置` 按钮手动归零；tag 在「目标 N 杯」和「已达标 🎉」之间切换
- 每天自动重置：写入时带 `YYYY-M-D` 日期戳；切回前台时再读 storage；启动时排个 `setTimeout` 到本地 `00:00:01` 主动清零

### 扭蛋页（第 3 页）

- 默认 spin 视图：大结果窗口（显示扭到的饭）+ 圆形橙色按钮
- 点击"扭一下"会循环 18 步逐渐减速，最后落在随机一个选项；选项 ≥ 2 个时尽量避免连续两次同结果
- 点击右上角「✎ 管理」切换到 manage 视图：chip 列表（点 × 删除，至少保留 1 个）+ 输入框添加新选项
- 自定义选项也存 localStorage，初值有 9 个种子饭

## 6. 更新下一年节假日数据

每年 11 月前后，国务院办公厅会发布下一年度的节假日安排。用 `fetch-holidays` 从 timor.tech 拉对应年份的数据，把输出的两段 TS 代码粘贴进 `src/lib/holidays.ts` 对应的两个数组即可，不需要改任何计算逻辑（`workday.ts` 是纯根据这两份数据算的）。**只有手动跑这条命令时会联网**，小组件运行时不会发任何网络请求。

```powershell
npm run fetch-holidays -- 2027
```

输出（每行末尾的 `// 五–日` / `// 一` 是工具自动算的星期，对照原文能一眼看出有没有解析错）：

```ts
HOLIDAY_PERIODS 追加：
  { name: '元旦', start: '2027-01-01', end: '2027-01-03' }, // 五–日
  ...
ADJUSTED_WORKDAYS 追加：
  '2027-01-04', // 一
  ...
```

无需联网自检（跑内置断言）：`npm run fetch-holidays -- --self-test`。

贴完之后把 `holidays.ts` 顶部注释里的数据来源年份改成新一年即可。


## 7. 项目结构

```
electron/
└── main.js         # 主进程：创建无边框透明窗口、记住位置、右键菜单（无需 preload，关闭/置顶都走 IPC-free 路径）

src/
├── App.tsx                  # 卡片 UI + 滚轮翻页 + 三页路由（含下班 / 发工资进度条 + 编辑）
├── styles.css                # 卡片样式（鱼缸、杯子、扭蛋、翻页动画都在这里）
├── main.tsx                  # React 渲染入口
├── components/
│   ├── WaterTracker.tsx      # 饮水页（杯子 + 跨日自动重置）
│   └── LunchGacha.tsx        # 扭蛋页（spin / manage 两视图）
└── lib/
     ├── calendar.ts            # 农历 / 干支纪年 / 时间进度（浏览器原生 Intl）
     ├── holidays.ts             # 内置节假日数据
     ├── workday.ts              # 根据 holidays 算今天是否上班 / 休息 / 调休
     ├── useCalendarStatus.ts    # 每分钟刷新一次上面这些数据的 React hook
     └── lunchItems.ts           # 扭蛋选项的 localStorage 持久化

tools/
└── fetch-holidays.mjs       # 从 timor.tech API 拉数据 → holidays.ts 代码片段
```

## 8. 存储与隐私

小组件离线可用，所有数据都存在本地：

| 数据 | 位置 |
|---|---|
| 窗口位置 / 大小 | Electron userData 目录 |
| 饮水计数 | `localStorage['moyu-water-tracker-v1']`（带日期戳，跨日自动重置） |
| 扭蛋选项 | `localStorage['moyu-lunch-items-v1']` |
| 发工资日（每月几号） | `localStorage['moyu-payday-day']` |
| 下班时间（HH:MM） | `localStorage['moyu-offwork-time']` |
| 节假日 | 内置在 `src/lib/holidays.ts`，随代码分发 |

运行时（用户每次打开小组件）不向任何远程服务发起请求。只有手动跑 `npm run fetch-holidays` 更新节假日数据时会联网。

## 9. 设计说明

- **配色**：暖白卡片 `#FBF6EC` + 抹茶绿 `#5B7F5A` + 杏橙 `#E08E45`，强调元素按页面主题切换色（日历橙 / 饮水蓝 / 扭蛋橙+绿）
- **尺寸**：280px 宽，无固定高度；竖向翻页指示点贴在卡片左侧居中
- **依赖**：纯 React + Vite + TypeScript + Electron，没有运行时第三方 UI 库；样式全部手写 CSS（在 `src/styles.css` 里）
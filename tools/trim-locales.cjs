// electron-builder afterPack 钩子:裁剪 Chromium 语言包,只留中文和英文。
// 55 个 locales/*.pak 共约 49MB,裁掉后 unpacked 省 ~47MB,安装包省 ~10MB。
const fs = require('node:fs');
const path = require('node:path');

const KEEP = new Set(['zh-CN.pak', 'en-US.pak']);

exports.default = async function afterPack(context) {
  const localesDir = path.join(context.appOutDir, 'locales');
  if (!fs.existsSync(localesDir)) return;
  let removed = 0;
  for (const file of fs.readdirSync(localesDir)) {
    if (file.endsWith('.pak') && !KEEP.has(file)) {
      fs.rmSync(path.join(localesDir, file), { force: true });
      removed++;
    }
  }
  console.log(`[trim-locales] removed ${removed} locale paks, kept zh-CN / en-US`);
};

#!/usr/bin/env node
// 打包完成后清理 release 目录的中间产物,只留可分发的安装包:
//  - win-unpacked/  未压缩的完整应用(electron-builder 的中间产物,每次打包都会重新生成)
//  - *.blockmap     electron-updater 增量更新用,本应用没有自动更新,用不到
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = fileURLToPath(new URL('../release/', import.meta.url));

rmSync(join(releaseDir, 'win-unpacked'), { recursive: true, force: true });

for (const file of readdirSync(releaseDir)) {
  if (file.endsWith('.blockmap')) {
    rmSync(join(releaseDir, file), { force: true });
    console.log(`[clean-release] removed ${file}`);
  }
}

console.log('[clean-release] win-unpacked removed, release 目录只保留安装包');

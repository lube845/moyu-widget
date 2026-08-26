import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base: './' 让打包产物用相对路径引用资源，
// 这样 Electron 用 file:// 协议打开 dist/index.html 时也能正常加载。
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
    },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 单文件打包配置：将整个应用（含所有 JS/CSS/数据）内联进一个 index.html
// 用法：pnpm --filter @remake/web build:singlefile
// 产物：apps/web/dist/singlefile/index.html
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    resolve: { tsconfigPaths: true },
    // 单文件版禁止代码分包，所有逻辑打进一个 chunk
    base: './',
    build: {
        outDir: 'dist/singlefile',
        chunkSizeWarningLimit: 5000,
        assetsInlineLimit: 100000000,
    },
})
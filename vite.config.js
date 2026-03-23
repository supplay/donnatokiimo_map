import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // resolve を path.resolve として使うのが一般的です

export default defineConfig({
  plugins: [react()],
  root: './', // プロジェクトのルートを明示します
  build: {
    rollupOptions: {
      input: {
        // 表側の地図（ルートの index.html）
        main: path.resolve(__dirname, 'index.html'),
        // 管理画面（admin フォルダ内の index.html）
        admin: path.resolve(__dirname, 'admin/index.html'),
      },
    },
    outDir: 'dist', // ビルド成果物の出力先を確認
  },
})
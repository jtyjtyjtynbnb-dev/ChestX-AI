import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { cpSync, existsSync, createReadStream, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function copyLegacyAssets() {
  return {
    name: 'copy-legacy-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        // Vue transforms template image URLs into Vite asset-module imports.
        // Let Vite serve those as JavaScript; only raw image requests belong here.
        if (new URLSearchParams((req.url || '').split('?')[1]).has('import')) return next();
        const relative = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
        const assetRoot = resolve(root, 'assets');
        const file = resolve(assetRoot, relative);
        if (!file.startsWith(assetRoot) || !existsSync(file) || !statSync(file).isFile()) return next();
        const ext = file.toLowerCase().split('.').pop();
        const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' };
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const source = resolve(root, 'assets');
      if (existsSync(source)) {
        cpSync(source, resolve(root, 'dist/assets'), { recursive: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [vue(), copyLegacyAssets()],
  resolve: {
    alias: {
      '@': resolve(root, 'src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 8765,
    // 编辑器/工具的临时目录会触发 Windows 下的 EBUSY 文件监听错误，直接忽略。
    watch: {
      ignored: ['**/.*.tmpdir/**', '**/*.tmpdir/**']
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});

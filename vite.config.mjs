import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default defineConfig({
  base: '/wait/',
  publicDir: false,
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core'] },
  worker: { format: 'es' },
  build: {
    outDir: 'wait',
    lib: { entry: 'wait-player/src/main.ts', formats: ['es'], fileName: () => 'player.mjs' },
    rollupOptions: { output: { chunkFileNames: '[name]-[hash].mjs', assetFileNames: '[name]-[hash][extname]' } },
  },
  plugins: [{
    name: 'local-converter-assets',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses/mediabunny.txt', source: readFileSync('node_modules/mediabunny/LICENSE', 'utf8') });
      const wasm = readFileSync(require.resolve('@ffmpeg/core/wasm'));
      const midpoint = Math.ceil(wasm.length / 2);
      for (let part = 0; part < 2; part++) this.emitFile({ type: 'asset', fileName: `codec/core-${part}.bin`, source: wasm.subarray(part * midpoint, (part + 1) * midpoint) });
      for (const name of ['ffmpeg', 'core']) this.emitFile({ type: 'asset', fileName: `licenses/${name}.txt`, source: readFileSync(`wait-player/licenses/${name}.txt`, 'utf8') });
    },
  }],
});

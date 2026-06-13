import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';

const DATASET_PATH = 'public/data/concentration.json';

function culmDatasetPlugin(): Plugin {
  return {
    name: 'culm-dataset-export',
    async configureServer() {
      await writeDataset(DATASET_PATH);
    },
    async buildStart() {
      await writeDataset(DATASET_PATH);
    },
    writeBundle(options) {
      const outDir = resolve(options.dir, 'data');
      mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(DATASET_PATH), resolve(outDir, 'concentration.json'));
    },
  };
}

async function writeDataset(path: string): Promise<void> {
  const { buildDatasetSnapshot } = await import('./src/lib/dataset-snapshot.ts');
  writeFileSync(path, `${JSON.stringify(buildDatasetSnapshot(), null, 2)}\n`);
}

export default defineConfig({
  base: '/culm/',
  build: {
    outDir: 'dist',
  },
  plugins: [culmDatasetPlugin()],
  test: {
    environment: 'node',
  },
});

import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';

const DATASET_PATH = 'public/data/concentration.json';
const SEABED_DATA_PATH = 'public/data/seabed-hotspots.json';

function culmDatasetPlugin(): Plugin {
  return {
    name: 'culm-dataset-export',
    async configureServer() {
      await writeDataset(DATASET_PATH);
      await writeSeabedDataset(SEABED_DATA_PATH);
    },
    async buildStart() {
      await writeDataset(DATASET_PATH);
      await writeSeabedDataset(SEABED_DATA_PATH);
    },
    writeBundle(options) {
      const outDir = resolve(options.dir, 'data');
      mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(DATASET_PATH), resolve(outDir, 'concentration.json'));
      copyFileSync(resolve(SEABED_DATA_PATH), resolve(outDir, 'seabed-hotspots.json'));
    },
  };
}

async function writeDataset(path: string): Promise<void> {
  const { buildDatasetSnapshot } = await import('./src/lib/dataset-snapshot.ts');
  writeFileSync(path, `${JSON.stringify(buildDatasetSnapshot(), null, 2)}\n`);
}

async function writeSeabedDataset(path: string): Promise<void> {
  const { buildSeabedDatasetSnapshot } = await import('./src/lib/seabed-dataset.ts');
  writeFileSync(path, `${JSON.stringify(buildSeabedDatasetSnapshot(), null, 2)}\n`);
}

export default defineConfig({
  base: '/culm/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        seabed: resolve(__dirname, 'seabed/index.html'),
        materials: resolve(__dirname, 'materials/index.html'),
        controls: resolve(__dirname, 'controls/index.html'),
        compute: resolve(__dirname, 'compute/index.html'),
      },
    },
  },
  plugins: [culmDatasetPlugin()],
  test: {
    environment: 'node',
  },
});

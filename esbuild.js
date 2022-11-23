import esbuild from 'esbuild'
import { clean } from 'esbuild-plugin-clean'
import copyFilePlugin from 'esbuild-plugin-copy-file'
import fileloc from 'esbuild-plugin-fileloc'

const banner = `#!/usr/bin/env node
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
`

esbuild
  .build({
    entryPoints: ['./src/index.ts', './src/args.ts', './src/blocks.ts', './src/config.ts'],
    platform: 'node',
    target: 'node16',
    bundle: true,
    plugins: [
      clean({
        patterns: ['./dist/*']
      }),
      fileloc.filelocPlugin(),
      copyFilePlugin({
        after: {
          './dist/package.json': './package.json',
          './dist/README.md': './README.md',
          './dist/LICENSE.txt': './LICENSE.txt'
        }
      })
    ],
    loader: {
      '.ts': 'ts',
      '.js': 'js',
      '.cjs': 'js',
      '.yml': 'text'
    },
    outdir: 'dist',
    external: ['package.json'],
    minify: true,
    sourcemap: false,
    format: 'esm',
    banner: {
      js: banner
    }
  })
  .catch(error => {
    console.error(error.message)
    process.exit(1)
  })

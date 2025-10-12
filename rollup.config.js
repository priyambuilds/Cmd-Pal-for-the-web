/** @type {import('rollup').RollupOptions} */
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import { visualizer } from 'rollup-plugin-visualizer'
import analyze from 'rollup-plugin-analyzer'

const isProduction = process.env.NODE_ENV === 'production'
const shouldAnalyze = process.env.ANALYZE === 'true'

/**
 * Bundle analysis plugins - only enable when ANALYZE=true
 */
const analysisPlugins = shouldAnalyze
  ? [
      // Visual bundle analyzer
      visualizer({
        filename: 'dist/stats.html',
        title: 'CMDK Bundle Analysis',
        template: 'treemap', // 'sunburst' | 'treemap' | 'network'
        sourcemap: true,
        gzipSize: true,
        brotliSize: true,
      }),

      // Bundle size analyzer
      analyze({
        summaryOnly: true,
        limit: 10000, // Warn if bundle exceeds 10kb
      }),
    ]
  : []

export default [
  // ESM Build (Modern)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'esm',
        sourcemap: !isProduction,
        exports: 'named',
      },
      // UMD build for browser compatibility
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'CMDK',
        sourcemap: !isProduction,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    ],
    external: ['react', 'react-dom'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        declarationMap: true,
      }),
      // Tree shaking optimizations
      isProduction &&
        terser({
          compress: {
            drop_console: false, // Keep console for debugging
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove in production
          },
          mangle: {
            safari10: true,
          },
        }),
      ...analysisPlugins,
    ].filter(Boolean),
  },

  // CJS Build (Legacy)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named',
    },
    external: ['react', 'react-dom'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      isProduction && terser(),
      ...analysisPlugins,
    ].filter(Boolean),
  },
]

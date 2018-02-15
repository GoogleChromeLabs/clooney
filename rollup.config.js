import alias from 'rollup-plugin-alias';

export default {
  input: 'dist/clooney.js',
  output: {
    file: 'dist/clooney.bundle.js',
    format: 'iife',
    name: 'Clooney',
  },
  plugins: [
    alias({
      'comlink': 'node_modules/comlinkjs/comlink.es6.js',
    }),
  ],
};

export default {
  input: 'dist/clooney.js',
  external: ['comlink'],
  output: {
    file: 'dist/clooney.bundle.js',
    format: 'iife',
    name: 'Clooney',
    globals: {
      comlink: '{Comlink}', // lol
    },
  },
};

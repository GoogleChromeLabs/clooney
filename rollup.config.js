export default [
  {
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
  },
  {
    input: 'dist/clooney-worker.js',
    external: ['comlink'],
    output: {
      file: 'dist/clooney-worker.bundle.js',
      format: 'iife',
      name: 'ClooneyWorker',
      globals: {
        comlink: '{Comlink}', // lol
      },
    },
  },
];

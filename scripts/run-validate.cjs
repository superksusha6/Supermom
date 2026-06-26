// Bootstrap that runs the compiled validation harness, mapping '@/...' imports to
// the compiled output dir (tsc does not rewrite path aliases in emitted JS).
const path = require('path');
const Module = require('module');

const OUT = path.resolve(__dirname, '..', '.validate-out');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const mapped = request.startsWith('@/') ? path.join(OUT, 'src', request.slice(2)) : request;
  return originalResolve.call(this, mapped, ...rest);
};

const entry = process.argv[2] || 'validateRecipeNutrition.js';
require(path.join(OUT, 'scripts', entry));

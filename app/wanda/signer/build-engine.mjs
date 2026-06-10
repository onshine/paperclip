/**
 * 重建内嵌签名引擎(当万达更新小程序 wasm / 换签名算法时用)
 *
 * 流程:index_bg.wasm --wasm-opt -Oz--> --wasm2js--> 包成 var --terser--> wanda_engine.min.js
 * 产物 wanda_engine.min.js 需手动拼到 ../wanda.js 顶部「签名引擎」段(替换旧引擎)。
 *
 * 依赖:npm i  (binaryen + terser,见 package.json devDependencies)
 * 跑法:node build-engine.mjs [新的 index_bg.wasm 路径]
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-06-10
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { minify } from 'terser';

const __dir = dirname(fileURLToPath(import.meta.url));
const srcWasm = process.argv[2] || join(__dir, 'index_bg.wasm');
const bin = join(__dir, 'node_modules', 'binaryen', 'bin');
const tmp = mkdtempSync(join(tmpdir(), 'wanda-engine-'));

console.log('[1/4] wasm-opt -Oz', srcWasm);
const optWasm = join(tmp, 'opt.wasm');
execFileSync(process.execPath, [join(bin, 'wasm-opt'), srcWasm, '-Oz', '--strip-debug', '--strip-producers', '-o', optWasm]);

console.log('[2/4] wasm2js');
const asmJs = join(tmp, 'asm.js');
execFileSync(process.execPath, [join(bin, 'wasm2js'), optWasm, '-Oz', '-o', asmJs]);

console.log('[3/4] wrap as var WANDA_ASM_FN');
let s = readFileSync(asmJs, 'utf8');
s = s.replace(/^import \* as wbg from 'wbg';\s*/m, '');
s = s.replace(/var retasmFunc = asmFunc\(\{[\s\S]*$/m, 'return asmFunc;');
s = 'var WANDA_ASM_FN=(function(){\n' + s + '\n})();';

console.log('[4/4] terser minify');
const out = join(__dir, 'wanda_engine.min.js');
const r = await minify(s, { compress: { passes: 2 }, mangle: true, format: { ascii_only: true } });
writeFileSync(out, r.code);
console.log(`✅ ${out}  (${(r.code.length / 1024).toFixed(1)} KB)`);
console.log('→ 把它替换到 ../wanda.js 顶部「万达签名引擎」段,再用 sign-core.js 的 createSigner 调 WANDA_ASM_FN(imports)');

/**
 * 万达电影签名服务 · 自托管版 (Node, 给 VPS 用)
 *
 * 和 worker.js 等价,但跑在自己的 VPS 上(CF 的 workers.dev / 自有域名国内直连不通时用)。
 * Loon 跑 cron 的请求是直连,所以签名服务必须放一个你这条网络能直连到的地方。
 *
 * 跑法:
 *   node server.mjs            # 默认监听 0.0.0.0:8787
 *   PORT=9000 node server.mjs  # 自定义端口
 * 然后用 NPM(Nginx Proxy Manager)反代 + SSL 到一个域名,DNS 直接指向 VPS(别开 CF 橙云)。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-10
 */

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createSigner, urlEncodeUnicode } from './sign-core.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const AUTH_KEY = process.env.AUTH_KEY || ''; // 设了就要求 ?key= 或 x-auth 头一致

// 实例化 wasm 一次,常驻
const wasmBytes = readFileSync(join(__dir, 'index_bg.wasm'));
const signer = createSigner();
const { instance } = await WebAssembly.instantiate(wasmBytes, signer.imports);
signer.bindExports(instance.exports);
console.log('[wanda-signer] wasm ready');

const send = (res, status, obj) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(body);
};

const server = http.createServer((req, res) => {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST {ts, uri, body} only' });

    if (AUTH_KEY) {
        const u = new URL(req.url, 'http://x');
        const key = u.searchParams.get('key') || req.headers['x-auth'] || '';
        if (key !== AUTH_KEY) return send(res, 401, { error: 'unauthorized' });
    }

    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
    req.on('end', () => {
        let p;
        try { p = JSON.parse(raw); } catch (_) { return send(res, 400, { error: 'bad json' }); }
        const ts = String(p.ts || '');
        const uri = String(p.uri || '');
        const body = typeof p.body === 'string' ? p.body : JSON.stringify(p.body || {});
        if (!ts || !uri) return send(res, 400, { error: 'missing ts/uri' });
        try {
            const check = signer.signature(ts, uri, urlEncodeUnicode(body));
            send(res, 200, { check });
        } catch (err) {
            send(res, 500, { error: String(err && err.message || err) });
        }
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`[wanda-signer] listening on :${PORT}`));

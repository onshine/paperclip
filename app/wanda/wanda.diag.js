/**
 * 万达电影 · 网络诊断(临时,定位 $httpClient 超时)
 *
 * 手动跑(或临时挂 cron),看通知/日志里 4 个探针的结果:
 *   P1 控制组(百度)     —— $httpClient 整体能不能用
 *   P2 GET 万达根域       —— 这个 host 经 $httpClient 能不能连
 *   P3 POST 签到接口(极简头) —— POST 到目标路径能不能收到响应
 *   P4 POST 签到接口(全头+假签名) —— 复刻真实请求形状(假 check 会被秒拒 403,只看 HTTP 通不通)
 *
 * 判读:
 *   P1✅ P2❌      → 这个 host 经 $httpClient 不可达(DNS/IP/TLS),开 Loon DoH / 关 IPv6
 *   P1✅ P2✅ P3/4❌ → host 能连,是 POST/某个头让它卡住
 *   P1❌           → $httpClient 整体不通(Loon 网络/节点问题)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-06-10
 */

const $ = new Env('万达诊断');
const HOST = 'https://front-gateway-c.wandafilm.com';
const URI = '/sign_in/do_sign_in.api';

(async () => {
    let ck = {};
    try { ck = JSON.parse($.getdata('wanda_data') || '{}'); } catch (e) {}
    const token = ck.token || 'DUMMYTOKEN';
    const user = ck.user || 'DUMMYUSER';
    const ts = Date.now();
    const body = JSON.stringify({ signInDate: '2026-06-10', ruleScene: 1, json: 'true' });
    const mxapi = JSON.stringify({
        ver: '6.5.3', sCode: 'Wanda', _mi_: token, width: 1280, json: true,
        cCode: 'XIAOCHENGXUGP', check: 'deadbeefdeadbeefdeadbeefdeadbeef', ts, heigth: 720, appId: 3,
    });

    const lines = [];
    lines.push(await probe('P1 baidu  ', 'GET', 'https://www.baidu.com/', {}, null));
    lines.push(await probe('P2 wd-root', 'GET', HOST + '/', {}, null));
    lines.push(await probe('P3 wd-min ', 'POST', HOST + URI, { 'Content-Type': 'application/json' }, '{}'));
    lines.push(await probe('P4 wd-full', 'POST', HOST + URI, {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'WandaFilm MiniProgram',
        'X-Mtime-Platform-Id': '3',
        'MX-API': mxapi,
        'X-RY-CHANNEL': 'XIAOCHENGXUGP',
        'X-RY-TIMESTAMP': String(ts),
        'X-RY-VERSION': '6.5.3',
        'X-RY-TOKEN': token,
        'X-RY-CHECK': 'deadbeefdeadbeefdeadbeefdeadbeef',
        'X-RY-USER': user,
    }, body));

    const report = lines.join('\n');
    $.log('\n===== 万达诊断结果 =====\n' + report);
    $.msg('万达诊断', '4 个探针结果(详见日志)', report);
    $.done();
})();

function probe(name, method, url, headers, body) {
    const t0 = Date.now();
    return new Promise((resolve) => {
        const opts = { url, timeout: 12, headers: headers || {} };
        if (body != null) opts.body = body;
        const cb = (err, resp, data) => {
            const ms = Date.now() - t0;
            if (err) { resolve(`${name} ❌ ${ms}ms ${short(JSON.stringify(err))}`); return; }
            const code = resp && (resp.statusCode || resp.status);
            resolve(`${name} ✅ ${ms}ms HTTP${code} ${short(data)}`);
        };
        method === 'POST' ? $.post(opts, cb) : $.get(opts, cb);
    });
}

function short(s) {
    if (!s) return '';
    return String(s).replace(/\s+/g, ' ').slice(0, 90);
}

// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon = () => typeof $loon !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (typeof $notification !== 'undefined') $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.get = (req, cb) => this.send(req, 'GET', cb);
    this.post = (req, cb) => this.send(req, 'POST', cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
            fn(req, (err, resp, data) => {
                if (resp) { resp.body = data; resp.statusCode = resp.status || resp.statusCode; }
                cb(err, resp, data);
            });
        } else if (this.isQuanX()) {
            req.method = method;
            $task.fetch(req).then(
                (r) => { r.status = r.statusCode; cb(null, r, r.body); },
                (e) => cb(e.error || e, null, null)
            );
        }
    };
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}

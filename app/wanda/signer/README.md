# 万达电影签名 · 引擎来源 & 可选远程部署

> **正常用不到这个目录。** 主脚本 [`../wanda.js`](../wanda.js) 已把签名引擎(wasm2js 转的纯 JS)
> **内嵌**,Loon 本地离线算签名,不需要任何外部服务。
>
> 这个目录留两样东西:
> 1. **引擎来源 + 重建脚本**(`build-engine.mjs`)—— 万达更新 wasm 换算法时,用它重新生成内嵌引擎。
> 2. **可选的「远程签名」部署**(Worker / VPS)—— 仅在你不想内嵌、想把签名放外部时用。
>    ⚠️ 实测 `*.workers.dev` 及 CF 自有域名(橙云)国内 cron **直连不通**,远程方案国内基本只能走 VPS。

---

## 重建内嵌引擎(万达换 wasm 时)

```bash
cd app/wanda/signer
npm i                                   # binaryen + terser
node build-engine.mjs [新的 index_bg.wasm]   # 默认用本目录的 index_bg.wasm
# 产物 wanda_engine.min.js,按提示替换到 ../wanda.js 顶部「签名引擎」段
```

流程:`index_bg.wasm` --`wasm-opt -Oz`--> --`wasm2js`--> 包成 `var WANDA_ASM_FN` --`terser`--> ~57KB 纯 JS。

---

## (可选) 远程签名服务

万达的请求签名 `x-ry-check` 由小程序内一段 WASM 算出。下面两种部署把 wasm 跑在远端,
Loon 脚本发 `{ts, uri, body}` 来换签名。**只算签名,不接收/不存储任何 token。**

> ⚠️ **国内网络注意**:Loon 跑 cron 的请求是**直连(不走代理)**,而 `*.workers.dev` 以及
> CF 自有域名(橙云)从国内 ISP 直连常常不通(超时/RST)。实测下来 **CF 这条路对国内 cron 不可靠**,
> 推荐用下面的 **自托管(VPS)** 部署。CF Worker 版作为海外/可达环境的备选保留。

## 文件

- `server.mjs` — **自托管版**(Node http 服务,给 VPS 用)← 国内推荐
- `Dockerfile` / `docker-compose.yml` — 自托管 Docker 化
- `worker.js` — CF Worker 版入口(`POST {ts, uri, body}` → `{check}`)
- `sign-core.js` — wasm-bindgen glue + `urlEncodeUnicode`(从小程序 `wasm/index.js` 还原,两版共用)
- `index_bg.wasm` — 万达电影小程序公开包里的签名 wasm(33KB)
- `wrangler.toml` — CF 部署配置
- `package.json` — 自托管版用(`type: module` + `npm start`)

## 部署 A:自托管 VPS(国内推荐)

VPS 上(已装 Docker):

```bash
cd app/wanda/signer
docker compose up -d --build
# 起在 0.0.0.0:8787,docker logs wanda-signer 看到 "wasm ready / listening" 即可
```

然后:
1. **DNS**:给签名域名(如 `wanda-sign.byteden.xyz`)加一条 A 记录指向 **VPS IP**,在 Cloudflare 里设**仅 DNS(灰云)**——不要走 CF 橙云代理,否则又回到 CF 不可达的问题。
2. **NPM(Nginx Proxy Manager)**:新建 Proxy Host,域名填签名域名,转发到 `VPS内网IP:8787`,开 SSL(Let's Encrypt)。
3. Loon 的 `wanda_signer_url` 填 `https://wanda-sign.byteden.xyz`(指向你 VPS 了)。

> 不想用域名/NPM 也行:直接 `http://VPS_IP:8787` 填进 `wanda_signer_url`(签名请求不含 token,明文 http 也只泄露 ts/uri/body,无敏感信息;但建议还是上 SSL)。
> 想加访问限制:`docker-compose.yml` 里设 `AUTH_KEY`,Loon 地址末尾带 `?key=同值`。

## 部署 B:Cloudflare Worker(海外/可达环境)

需要 [Node](https://nodejs.org) + Cloudflare 账号(免费版即可)。

```bash
cd app/wanda/signer
npx wrangler login          # 浏览器授权一次
npx wrangler deploy
```

部署完会打印地址,形如 `https://wanda-signer.<你的子域>.workers.dev`。

把这个地址填到 Loon 持久化键 **`wanda_signer_url`**(BoxJS 加一项,或脚本里直接改 `wanda.js` 顶部 `SIGNER_URL`)。

## 验证

```bash
curl -X POST https://wanda-signer.<你的子域>.workers.dev \
  -H 'content-type: application/json' \
  -d '{"ts":"1781077076053","uri":"/sign_in/do_sign_in.api","body":"{\"signInDate\":\"2026-06-10\",\"ruleScene\":1,\"json\":\"true\"}"}'
# 期望: {"check":"ed345126ba6dcb5efa7022f4d3a6eebb"}
```

返回这个固定值就说明 wasm 跑通了(这是该输入的确定签名,可作回归基准)。

## 可选:加访问限制

Worker 默认公开(但只会算签名,没 token 啥也干不了)。要限制就在 `wrangler.toml` 里设 `AUTH_KEY`,
然后 Loon 的 `wanda_signer_url` 末尾带 `?key=同一个值`。

## 接口

```
POST /
Content-Type: application/json
{ "ts": "<毫秒时间戳字符串>", "uri": "/sign_in/do_sign_in.api", "body": "<要发送的原始 JSON body 字符串>" }

→ { "check": "<32位十六进制签名>" }
```

Worker 内部对 `body` 做 `urlEncodeUnicode` 后算 `signature(ts, uri, c)`。调用方(Loon)发送给万达的 body 用**原始 JSON**,`ts` 必须与本次请求头里的 `X-RY-TIMESTAMP` 一致。

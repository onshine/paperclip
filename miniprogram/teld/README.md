<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png" width="80" alt="特来电" />
</p>

# 特来电

> ✅ **维护中** · **全链路实测跑通**:间隔 40 分钟两次 cron,均成功 teldb 刷新 telda → 打卡(服务端 `12904 今日已打卡`)。剩待长期观察:① 明天未签时拿到 `✅ 签到成功`(目前只测到「已打卡」)② teldb 滚动跨多日续期稳定性

特来电(充电桩)微信小程序「签到365天领手机」每日打卡。打卡接口 `ProSrv-CompleteCheckInTask` 跑在内嵌 H5(`c2.teld.cc` / `sgi.teld.cc`),鉴权用 Cookie 里的 `telda`(X-Token,仅 ~20 分钟,cron 时用 `teldb` 自动刷新),签名 `WVER` 本地用 BigInt 算,无任何外部依赖。

## 文件

- `teld.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 打卡,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. 打开微信小程序「特来电」→ 进入「签到365天」活动页(触发 `sgi.teld.cc` 接口,带 `telda`/`teldb`)
3. 收到 `✅ 特来电 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动打卡(每次先用 teldb 刷新 telda 再签到)

> 调试:脚本首行打印版本号(确认拉到最新);`teld_debug=true` 开详细日志;日志前缀 `[capture]`/`[刷新]`/`[检测]`/`[响应]` 分别对应抓取/续期/请求参数/响应。

## Loon

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[Script]
http-request ^https:\/\/sgi\.teld\.cc\/api\/invoke tag=特来电 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png

cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, tag=特来电签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png, enable=true
```

## Surge

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[Script]
特来电 Cookie = type=http-request,pattern=^https:\/\/sgi\.teld\.cc\/api\/invoke,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png

特来电签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png
```

## Quantumult X

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[rewrite_local]
^https:\/\/sgi\.teld\.cc\/api\/invoke url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, tag=特来电签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 特来电签到
      cron: '30 8 * * *'
      timeout: 60

http:
  mitm:
    - "sgi.teld.cc"
    - "c2.teld.cc"
  script:
    - match: ^https:\/\/sgi\.teld\.cc\/api\/invoke
      name: 特来电 Cookie
      type: request
      require-body: false

script-providers:
  特来电签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-03 | 初版:每日打卡,凭据自动续期,全自包含无需外部服务 |
| 2026-06-04 | 全链路实测跑通:cron 自动续期 + 打卡成功 |
| 2026-06-10 | 多日 cron 稳定,🧪→✅ 维护中 |

## 已知限制

- **teldb 滚动,勿在周期内手动开签到页**:每次刷新 teldb 都换新、脚本自动写回;若你手动打开特来电小程序签到页,会把 teldb 滚走、作废脚本存的那个 → 需重抓 Cookie
- **teldb ~15 天有效**:过期后需重进签到页重抓 Cookie(暂未做 app 账密登录自动 bootstrap)
- **设备时间**:与服务器时差过大可能验签被拒,保持系统时间准确即可
- **长期稳定性待观察**:未签日的 `✅ 签到成功` 及凭据跨多日续期待持续验证

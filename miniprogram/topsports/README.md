<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png" width="80" alt="滔搏" />
</p>

# 滔搏

滔搏运动(Topsports)微信小程序「每日中心」签到送积分。鉴权用 Cookie 里的 `Authorization`(UUID 会话票据)+ `memberId`,无签名。`activityId` 由 `actInfo` 接口动态获取,不写死。

## 文件

- `topsports.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「滔搏运动」→ 进入「每日中心 / 签到」页(`dailycenter`),停留即触发 `actInfo`
3. 收到 `🎉 Cookie 抓取成功` 通知即入库
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = m.topsports.com.cn

[Script]
http-request ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo tag=滔搏 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enable=true
```

## Surge

```ini
[MITM]
hostname = m.topsports.com.cn

[Script]
滔搏 Cookie = type=http-request,pattern=^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

滔搏签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
```

## Quantumult X

```ini
[MITM]
hostname = m.topsports.com.cn

[rewrite_local]
^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 滔搏签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "m.topsports.com.cn"
  script:
    - match: ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo
      name: 滔搏 Cookie
      type: request
      require-body: false

script-providers:
  滔搏签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
    interval: 86400
```

## 实现细节

- **鉴权** — Cookie 里的 `Authorization`(UUID Bearer 会话票据)+ `memberId`,无签名;由 `/shopMember/auth/wxMiniProgram/login?code=<jscode>` 登录签发
- **activityId 动态获取** — 先 GET `/h5/act/signIn/actInfo?brandCode=TS` 拿当前 `activityId`,再 POST `/h5/act/signIn/doSign`,不写死活动 ID
- **签到判定** — 以 `data.signInSuccess === true` 为成功(读 `signInTips` + 奖励明细);重复签到按 `bizMsg` 文案识别为「今日已签」;`actInfo` 失败即判 Cookie 失效

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版,Cookie 鉴权,activityId 走 actInfo 动态获取,brandCode=TS |
| 2026-06-01 | ~~doSign 50010:补 `version` + `sec-fetch-*` 请求头~~(假设有误) |
| 2026-06-02 | ~~doSign 50010:`refreshAcwTc()` 刷新 acw_tc~~ / ~~补 getTimeStamp+loginStatus 激活会话~~(均证伪)。`refreshAcwTc()` 保留(超 30 分钟仍需新 acw_tc) |
| 2026-06-02 | **doSign 50010 真因确诊:`Authorization` 轮换**。50010 改为可操作提示「重抓 cookie」。删除证伪的激活调用 |

## doSign 50010 排查结论(抓包 + 对照实验确诊)

**真因:`Authorization` 每次打开小程序都会轮换,旧的作废。**
- 抓包对照:cron 存的 auth 末位 `…ab81e9` = 抓包里正在被淘汰的旧 auth;小程序已换成新的(`…39617`),doSign 用新的才成功
- 对照实验:重进每日中心页重抓 → auth 末位变(`ab81e9→8f94d5`)→ doSign 不再 50010
- `actInfo` 校验宽松(旧 auth 仍给 activityId),`doSign` 严格(旧 auth 即「小程序权限不足」),所以只挂 doSign
- 现象「刚抓完成功、过段时间失败」= 抓完后又开过小程序(auth 轮换)或 auth 自身到期

**这不是脚本能修的 bug**:拿新 auth 需要微信 jscode 登录,脚本做不到。50010 时脚本提示重抓即可。

### acw_tc(次要、已处理)
- `acw_tc` 是阿里云 WAF cookie(`Set-Cookie;Max-Age=1800`/30 分钟、HttpOnly),只由 `/static/setCookieApplets.html` 下发,签到接口不刷新
- `refreshAcwTc()` 重放该入口拿新 acw_tc(超 30 分钟仍需要),依赖代理内核把 HttpOnly 的 Set-Cookie 暴露给脚本(Loon 实测可拿到)

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- **`Authorization` 会因打开小程序而轮换,定时签到只在"未再打开小程序 + auth 未到期"期间有效**;失效后脚本报 50010 并提示,需重进每日中心页重抓。auth 自身存活时长待长期观察
- 完整 cookie 需含 `appletsSource`/`memberId`(靠 normalizeCookie 拆脏前缀)
- `brandCode` 固定 `TS`

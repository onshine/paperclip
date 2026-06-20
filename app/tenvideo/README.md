<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png" width="80" alt="腾讯视频" />
</p>

# 腾讯视频

> ✅ **维护中** · 从归档复活,**实测成功**(`✅ 签到成功,获得 10 V力值`):cron 先用 `refresh_token` 走 `Account/Refresh` 换新 vusession(免 qimei、免签名),再调 `CheckIn` 签到。**无人值守**

腾讯视频 VIP 每日签到(V力值)。签到接口 `CheckIn` 无签名、纯靠有效 vusession;而 vusession 仅 2 小时,旧版靠用户手动开 app 续命。新版用 `refresh_token`(长期、cookie 里)走 `pbaccess.video.qq.com/.../Account/Refresh` 每次现刷 vusession,实现无人值守。

## 文件

- `tenvideo.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. **抓 Cookie(二选一,小程序最省事)**:
   - **iOS 微信打开「腾讯视频」小程序**,随便点几下 → 触发 `pbaccess.video.qq.com` 请求(带 cookie)
   - 或 iOS Safari 登录 `v.qq.com`(请求桌面网站)→ 切后台再切回
3. 收到 `✅ 腾讯视频 Cookie 获取成功` 通知即成功
4. cron 自动签到(每次先 `Account/Refresh` 换新 vusession,再 `CheckIn`)

> 调试:脚本首行打印版本号;`tenvideo_debug=true` 开详细日志;日志前缀 `[capture]`/`[刷新]`/`[检测]`/`[响应]`。

## Loon

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
http-request ^https:\/\/pbaccess\.video\.qq\.com\/ tag=腾讯视频 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

cron "10 0 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enable=true
```

## Surge

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
腾讯视频 Cookie = type=http-request,pattern=^https:\/\/pbaccess\.video\.qq\.com\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

腾讯视频签到 = type=cron,cronexp=10 0 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png
```

## Quantumult X

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[rewrite_local]
^https:\/\/pbaccess\.video\.qq\.com\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js

[task_local]
10 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 腾讯视频签到
      cron: '10 0 * * *'
      timeout: 60

http:
  mitm:
    - "pbaccess.video.qq.com"
    - "vip.video.qq.com"
  script:
    - match: ^https:\/\/pbaccess\.video\.qq\.com\/
      name: 腾讯视频 Cookie
      type: request
      require-body: false

script-providers:
  腾讯视频签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| — | 初版(@WowYiJiu):抓 cookie 回放签到 |
| 2026-06-05 | 复活:自动续期后再签到,无人值守。状态 📦→🧪。实测 `✅ 获得 10 V力值` |
| 2026-06-10 | 多日实测稳定,🧪→✅ 维护中 |

## 已知限制

- **refresh_token 滚动,勿在周期内正常用腾讯视频**:每次刷新换新 refresh_token(脚本自动写回);你平时用 app/小程序/网页时它也会滚,可能把脚本存的滚旧失效 → cron 报"刷新失败"时,**iOS 微信开下「腾讯视频」小程序即可重抓**。隔天是否失效(有无宽限期)待观察
- **refresh_token 长期但非永久**:网页 cookie 标注有效期约 1 年,长期未跑/被吊销后需重抓
- **奖励仅 V力值**,无实物兑换

## 致谢

- 原作者:[@WowYiJiu](https://github.com/WowYiJiu) — 初版签到逻辑与 CheckIn 接口

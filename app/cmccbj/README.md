<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png" width="80" alt="北京移动" />
</p>

# 北京移动

中国移动 APP(北京)「签到赢好礼」每日签到,送流量 / 积分。

## 文件

- `cmccbj.js` — 既是抓 Cookie 的重写脚本,也是 cron 签到脚本,根据 `$request` 是否存在区分。

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开中国移动 APP(北京)→ 进入「签到赢好礼」活动页 → **点一次「签到」按钮**
3. 收到 `✅ 北京移动 Cookie 获取成功` 通知即抓取成功(提示「constid 已就绪」才算齐)
4. cron 会按计划自动签到

> 进页面只能抓到 token,**必须亲手点一次签到**才能抓到 constid,二者齐了 cron 才跑得通。

## Loon

```ini
[MITM]
hostname = h5.bj.10086.cn

[Script]
http-request ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/ tag=北京移动 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, tag=北京移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enable=true
```

## Surge

```ini
[MITM]
hostname = %APPEND% h5.bj.10086.cn

[Script]
北京移动 Cookie = type=http-request,pattern=^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/,requires-body=0,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png

北京移动签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
```

## Quantumult X

```ini
[MITM]
hostname = h5.bj.10086.cn

[rewrite_local]
^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, tag=北京移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 北京移动签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "h5.bj.10086.cn"
  script:
    - match: ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/
      name: 北京移动 Cookie
      type: request
      require-body: false

script-providers:
  北京移动签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-24 | 初版(抓 token + constid,cron 先查状态再签) |

## 已知限制

- **仅北京移动**:活动域名 `h5.bj.10086.cn`,接口含 `isBj` 标识,其他省份不适用。
- **首次必须手动点一次签到**:进页面只下发 token,`constid` 只在点签到时才出现,缺它无法签。
- **token 时效未实测**(🧪 待验证):它由中国移动 APP 注入 H5,失效后 cron 会提示「token 失效请重抓」,届时重新打开 APP 进签到页即可刷新。
- `constid` 是设备风控指纹 token,一般较稳定可复用;若签到持续返回非 0,重新点一次签到刷新它。

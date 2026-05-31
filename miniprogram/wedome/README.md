<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png" width="80" alt="味多美" />
</p>

# 味多美

味多美微信小程序每日签到送积分(每日 +2 分)。底层卓健科技(zjian.net)+ 大咖(bigaka)会员 SaaS,鉴权 `buyer-token`,无 body 签名,抓一次长期复用(失效再抓)。

## 文件

- `wedome.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「味多美」→ 进入「签到」页(进页面自动触发 `get`,**无需手动点签到**)
3. 收到 `🎉 Token 抓取成功` 通知即入库
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
http-request ^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get tag=味多美 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enable=true
```

## Surge

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
味多美 Cookie = type=http-request,pattern=^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get,requires-body=false,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

味多美签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
```

## Quantumult X

```ini
[MITM]
hostname = scrm-b.zjian.net

[rewrite_local]
^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 味多美签到
      cron: '10 8 * * *'
      timeout: 60

http:
  mitm:
    - "scrm-b.zjian.net"
  script:
    - match: ^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get
      name: 味多美 Cookie
      type: request
      require-body: false

script-providers:
  味多美签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
    interval: 86400
```

## 实现细节

- **鉴权 + 进页面即抓** — `buyer-token` 在签到页所有接口上都有,抓进页面就触发的 `get` 即可拿到,**不依赖手动点签到**(避免「今日已签 → 按钮失效 → 抓不到」)
- **业务参数 cron 现取** — `get` 响应给 `activityId`、`getMyPointInfo` 给 `memberId`,再用 `{activityId, memberId, index:1}` 调 `signIn`(memberName 非必需,服务端按 activityId+memberId 判定)
- **签到判定** — `ok=true` 记为成功;否则用 `signInLog` 的 `createTime` 核对当天是否已签,并附 `getMyPointInfo` 积分余额
- **同套 SaaS 通用** — 卓健/大咖服务大量品牌小程序,改 `brandId` 即可适配,本脚本适配 `brandId=2039`(味多美北京)

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版;改为抓页面加载的 `get`(进页面即抓,无需点签到),cron 现取 activityId/memberId 重建 signIn |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- `buyer-token` 为微信会话票据,过期后签到失败,需重新进小程序签到页(进页面即可)重抓
- `index` 固定为 1(周期内天序),如连签计数异常再调整
- 仅适配 `brandId=2039`,其他品牌需自行抓取对应接口

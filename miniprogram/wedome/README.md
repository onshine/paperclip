<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png" width="80" alt="味多美" />
</p>

# 味多美

> 🧪 **待验证** · **2026-06-05 从归档复活** —— 解包发现 `loginByOpenid` 旁路,用「公众号 openid 换 token」绕开 `wx.login()`,openid 永久固定、免续期。端到端实测签到成功,长期稳定性观察中。

味多美微信小程序每日签到送积分(每日 +2 分)。底层卓健科技(zjian.net)+ 大咖(bigaka)会员 SaaS,`brandId=2039`(味多美北京)。

## 文件

- `wedome.js` — 单脚本架构:`http-response` 抓 openid(`$response` 存在)/ cron 自动签到(否则)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「味多美」→ 进入「签到」页(**登录时触发 `minaLogin`**),自动抓公众号 openid
3. 收到 `✅ 味多美 openid 已获取` 通知即入库(openid 永久有效,基本无需再抓)
4. cron 会按计划自动签到

> 也可直接在 BoxJS 手填 `wedome_openid`(你的公众号 openid),跳过抓取。

## Loon

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
http-response ^https:\/\/scrm-b\.zjian\.net\/api\/member\/minaLogin tag=味多美 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enable=true
```

## Surge

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
味多美 Cookie = type=http-response,pattern=^https:\/\/scrm-b\.zjian\.net\/api\/member\/minaLogin,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

味多美签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
```

## Quantumult X

```ini
[MITM]
hostname = scrm-b.zjian.net

[rewrite_local]
^https:\/\/scrm-b\.zjian\.net\/api\/member\/minaLogin url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js

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
    - match: ^https:\/\/scrm-b\.zjian\.net\/api\/member\/minaLogin
      name: 味多美 Cookie
      type: response
      require-body: true

script-providers:
  味多美签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
    interval: 86400
```

## 实现细节

- **复活核心:`loginByOpenid` 旁路** — 原 `buyer-token` 续期绑死 `wx.login()`(归档主因)。解包发现登录测试页有 `GET /api/member/h5/loginByOpenid?openid=<公众号openid>&brandId=2039`,**用公众号 openid 直接换 token,完全不碰 wx.login**,生产环境放行、无额外鉴权,openid 永久固定 → 一次抓取长期有效(和龙德广场「一次抓取永久有效」同级)
- **抓的是「公众号 openid」** — `http-response` 挂登录接口 `minaLogin`,取响应 `data.member.openid`(公众号 openid)。**注意不是小程序 openid**(`miniWeixinInfo.openid` / `memberWeixinApps[].openid`),小程序 openid 调 loginByOpenid 会返回 `410 根据openid获取unionid失败`
- **签到链(全动态,无写死易变值)** — `loginByOpenid` 换 token + memberId → POST `pointSignInActivitySet/get` 取当前 `activityId` → POST `signInLog?activityId&memberId` 签到(`signInLog` 即执行签到,幂等,已签返回当天已有记录)
- **鉴权头** — `buyer-token`(loginByOpenid 换来的)+ `brandId: 2039`,无 body 签名
- **同套 SaaS 通用** — 卓健/大咖服务大量品牌小程序,改 `brandId` + `openid` 即可适配其他商家

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版;抓页面加载的 `get` 拿 buyer-token,cron 现取 activityId/memberId 重建 signIn |
| 2026-06-01 | 📦 归档:`buyer-token` 续期需小程序登录(`401 用户未登录`),脚本无解 |
| 2026-06-05 | 🧪 **复活**:解包发现 `loginByOpenid` 旁路(公众号 openid 换 token,免 wx.login),改抓公众号 openid + cron 自动换 token,端到端实测签到成功 |

## 已知限制

- **openid 永久固定**,但换微信号 / 解绑会员后需重抓
- 抓取挂 `minaLogin`(登录时触发),若已登录态进小程序可能不调该接口 → **退出小程序重进**,或直接 BoxJS 手填 `wedome_openid`
- 仅适配 `brandId=2039`(味多美北京),其他品牌需改 brandId + 对应 openid

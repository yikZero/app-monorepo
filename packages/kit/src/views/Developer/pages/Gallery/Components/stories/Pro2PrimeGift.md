# Pro2PrimeGift Gallery

Pro 2 附赠 Prime 的客户端交互参考，仅保留在个人 fork 分支，不合并上游。

- 客户端需求：[OK-62311](https://onekeyhq.atlassian.net/browse/OK-62311)。
- 页面源码：[Pro2PrimeGift.tsx](./Pro2PrimeGift.tsx)。
- 依赖安装完成后，在仓库根目录执行 `WEB_PORT=3037 yarn app:web`，访问 <http://127.0.0.1:3037/dev/component-Pro2PrimeGift>。使用 Gallery 顶部主题开关切到深色。

## 预览

- 默认从 Onboarding 完成页开始，也可直接切换设备详情、领取页，或预览领取成功。
- 模拟条件分别控制登录、设备验证、活动、领取记录、邀请码与下次领取结果；切换页面保留条件，「恢复默认」重置全部状态。
- 成功页可继续体验 KYT 与通知引导；跳过后直接进入钱包。

## 范围

- 登录、设备验证、领取、邀请码及通知权限全部为本地模拟；设备设置不会执行真实操作，刷新后状态重置。
- 6 个月和到期日期为示例。正式版本由服务端返回资格、赠送月数及实际领取结果，并保证每台设备限领一次。
- 设备验证方式、Onboarding 验证凭据能否复用、已有 Prime 会员叠加规则待联调确认。
- 首页 KYT 自动引导移除另见 [OK-62310](https://onekeyhq.atlassian.net/browse/OK-62310)，本分支未改动生产引导逻辑。

## 组件复用

- 复用 Gallery Layout、SetupCard、ListItemGroup、Dialog 等现有组件。
- 权益说明复用 Prime Dashboard 的已上线权益数据与列表项，仅提供介绍。

# Blockaid 风险演示选材

核对时间：2026-09-09。以下依据官方文档与官方案例，表示 Blockaid 公开描述的能力，不代表 OneKey 已经为每条链、每类请求完整接入，也不是本地 fixture 的线上检测证明。

## 不只是无限授权

[EVM 返回值目录](https://docs.blockaid.io/api-reference/end-user-protection/transaction-scanning/evm/transaction-scanning-evm/evm-transaction-scanning-response-reference) 把风险判断、原因和细节分开。它包含资产无合理回报地流失、恶意地址或盗币合约、NFT 订单签名、异常兑换、代理升级、模块变更、EIP-7702 升级等场景。

授权或 Permit 发生本身是信息项。风险取决于接收方、权限范围、实际资产结果及其他证据，不能把“无限授权”直接等同于“已确认恶意”。

| 场景 | 可以讲清楚的故事 | 官方证据 |
| --- | --- | --- |
| 假空投、真实资产转出 | 用户以为领取奖励，实际请求将资产交给其他地址 | [Wallet drainer 实例](https://blockaid.io/blog/unmasking-wallet-drainers-step-by-step-breakdown-of-a-crypto-heist) |
| 伪装为正常兑换 | 调用正常 DEX 合约仍可能把收益给了攻击者；合约知名不等于本次交易安全 | 同一案例的 Native drain 部分，展示通过 SushiSwap Router 掩盖意图 |
| 恶意 Permit 签名 | 不支付 gas 的签名也能授予资产操作权限；展示高风险 spender 和具体授权 | 同一案例的 EIP-2612 Permit 部分；它不是 Permit2，复用故事时应保留这一区别 |
| NFT 订单签名 | Seaport 或 Blur 的签名允许转走 NFT，却没有合理补偿 | EVM 返回值目录中的市场订单相关原因与资产损失分类 |
| 钱包逻辑或权限变更 | 钱包升级为不可信实现、启用不可信模块、会话权限过宽或过长 | [EIP-7702 官方说明](https://blockaid.io/blog/building-safely-with-eip-7702-how-blockaid-helps-teams-adopt-the-future-of-smart-wallets) 与 EVM 返回值目录 |

## 本条样片建议

以“风险接收方／盗币合约”作为主要风险，以请求的授权内容作解释。详情优先展示接收方风险、可能失去的资产控制权和对应地址。无限额只解释影响范围，避免作为单独的恶意证据。

更适合作为下一条独立配置的是“正常兑换外观下的资产流失”。它能展示交易安全检查对执行结果的判断，但需要交易请求、资产变化和详情保持一致，不能只替换当前 Permit2 的风险文案。

不要把全部官方风险类型堆进同一请求。NFT、7702、恶意兑换和 Permit 是不同请求，分别维护 fixture 才方便复现，也能避免样片描述不可能同时发生的行为。

本地 fixture 使用 OneKey 的 `level/detail/features` 数据结构，Blockaid 官方使用 `validation` 下的分类、原因和 feature ID。两者不应被标注为完全相同的原始响应。本地数据应保留 synthetic provenance、参考来源和所采用的请求类型。

# Transaction security check 演示

这条视频对应 Prime 的 Transaction security check 权益。演示基于包含 [PR #13190](https://github.com/OneKeyHQ/app-monorepo/pull/13190) 的 x 分支，使用真实 iOS WebView、原生 sheet，以及产品里的 SecurityCheckCard、风险详情和检查项弹层。

## 演示内容

OneKey Browser 首页书签打开 Rewards → 领取 USDC → 收到 Permit2 签名请求 → 等待检查 → 查看高风险 spender 详情 → 查看三项检查结果。风险确认复选框保留未勾选，默认流程不点击。

页面上的奖励、地址和风险结果均为本地固定演示数据。dApp 确实在 WebView 中发起请求，检查结果通过 fixture 注入；这条视频不证明线上检测服务能检出该站点。默认流程不执行最终 Confirm，不创建钱包，也不生成签名或广播交易。

演示先让 Site security、Signature analysis、Transaction security check 三项都处于 pending，真实卡片显示转圈和 `Checking...`，不提前显示局部结果。`fixture.json` 的 `scanDelayMs`（当前 1000ms）到时后，一次性传入完整检测结果。卡片主体展示高风险 spender 与 Permit 授权提醒，未验证站点状态保留在检查范围弹层，主体不重复展示 Unverified 行。这个节奏只用于演示；产品会按检查返回顺序逐步更新，已有 Warning 或 Risk 时即使还在转圈，也会先展示对应结论。

新场景没有 SignGuard 资产预览和扫光，不依赖动画完成节点。

画面上的站点是虚构展示源 `https://rewards.example.com`，不是真实检出域名。WebView 与 fixture 请求仍只走本机 `http://localhost:4737/dapp`。站点检查为未认证/未验证，不显示已认证绿标；签名解析完成，交易安全检查给出 spender 高风险。检查范围弹层里的状态表示是否完成该项检查，不表示每一项都判定安全。

风险重点是 spender 的恶意活动和盗币行为，不能把无限授权本身等同于恶意。选材依据和其他适合演示的场景见 [Blockaid 风险示例](BLOCKAID_EXAMPLES.md)。官方案例中的 EIP-2612 Permit 与本场景的 Permit2 是不同协议；这里复用的是风险故事，数据仍为合成 fixture。

## 重录和微调

在仓库根目录执行：

```sh
node development/prime-demo/demo.mjs check transaction-security-check
node development/prime-demo/demo.mjs record transaction-security-check
node development/prime-demo/demo.mjs render transaction-security-check --take latest
node development/prime-demo/demo.mjs render transaction-security-check --take latest --hold 4 --no-taps
```

首次在新 worktree 使用已有模拟器包时，可通过 `PRIME_DEMO_APP_PATH` 指向本地 `.app`。原生依赖有变化时需要重新构建，不能保证任意旧包兼容最新 JS。

| 调整内容 | 文件 | 是否需要重录 |
| --- | --- | --- |
| 奖励、签名请求、风险原因、地址、检测等待 | `features/transaction-security-check/fixture.json` | 是 |
| 点击顺序、控件、阅读停留 | 同目录 `feature.json` 的 `capture.steps` | 是 |
| 镜头目标、移动时长、曲线、提前到位时间 | 同目录 `camera.json` | 否 |
| 点击提示样式、时间偏移、显示开关 | 同目录 `taps.json` | 否 |
| 结果追加停留 | `compose.holdSeconds` 或命令的 `--hold` | 否 |
| 背景、手机框、输出尺寸 | `presets/prime-393x852.json` | 否 |

Browser 屏在不透明首页遮罩下挂载同一份全尺寸 WebView，让 WKWebView 在开拍前加载本地 HTML。`browserReady` 要等 Browser 转场结束、书签布局完成，且底层 dApp 已准备好；点击书签后首页淡出，露出同一 WebView 实例再报 `dappVisible`。领取按钮坐标仍来自 `dappReady`（可在首页遮罩下测得）。`capture.steps` 定位真实控件并执行点击，点击提示只是后期叠加。普通原生控件使用 testID 和实际布局位置；WebView 内的按钮由网页报告自身位置，再换算为设备坐标。关闭提示不会跳过真实操作。

步骤等待页面反馈、目标出现或消失后才继续，`holdMs` 负责留给观众阅读。镜头和提示引用当次录制的步骤节点，因此加载快慢改变时无需重填绝对秒数。镜头目标位置仍由作者指定；页面结构变化后应检查构图。

## 权益页视频节奏

这版用于看懂风险和检查范围；等待时长按信息量安排，优先缩短操作铺垫与重复返回。以下是额外等待配置，不含原生转场、控件查询和反馈等待，实际画面停留以每次成片为准。

| 阶段 | 先前配置 | 当前配置 |
| --- | --- | --- |
| 首页就绪后 | 1200ms | 650ms |
| dApp 展示后 | 1600ms | 900ms |
| 模拟检测 | 1400ms | 1000ms |
| 风险结果出现后 | 2400ms | 2200ms |
| 风险详情出现后 | 3200ms | 3200ms |
| 关闭风险详情后 | 1500ms | 650ms |
| 检查范围出现后 | 3200ms | 2600ms |
| 结束追加停留 | 2s | 1.4s |

镜头使用 1 秒 `smootherstep` 五次 S 曲线，起步和停下更柔和；检查范围镜头仍提前 2.5 秒到位，关闭检查范围后 1.2 秒回到卡片。相比原先 0.8 秒镜头，只提前 0.2 秒出发，到位时刻、后续阅读停留和总片长保持不变。风险详情保留阅读时间，不整片倍速。要让观众逐字阅读，需延长该段停留，或允许暂停视频。

这些秒数是本片的编辑选择，不是通用注意力阈值。[Brysbaert 的阅读速度综述](https://biblio.ugent.be/publication/8647789) 汇总了 190 项研究，成人英文非虚构文字平均默读约 238 词/分钟，并存在语言与个体差异。本片风险详情的标题和正文共约 60 词，按该均值粗算读完约 15 秒，尚未计入定位界面和阅读地址；短片的数秒停留用于扫读标题与重点，不代表所有人能读完整段。[Wistia 的视频长度分析](https://wistia.com/blog/optimal-video-length) 也按传播目标区分视频时长，不能据此推导每个画面固定要停几秒。

## 复现边界

每次 take 保存原片、事件、固定数据和配置快照。`render` 应用当前配置；`replay <历史输出目录>` 使用当次冻结配置。只重新合成不会改变视频中的金额或风险内容。

产品卡片、详情、检查项内部的 UI 调整会随重录更新。演示入口、浏览器外壳及确认页字段组合属于独立场景；产品导航或字段结构调整后仍要同步场景。当前覆盖 iOS 的 main 演示运行时，钱包 background 关闭，存储使用演示内存适配器。

验收应同时查看 Browser 首页与 Rewards 书签、真实 WebView 领取页、检查中状态、风险详情文本、三项检查结果，以及成片中对应内容是否位于可见窗口内。风险复选框应保持未勾选。仅有 testID 或节点日志不能替代这些检查。

检查帧时优先从已经合成的 30fps 视频取帧。模拟器原片是可变帧率，静止期间可能没有新帧；直接用 `-ss` 跳转原片会取到后续更新，不能据此判断目标时刻的画面。需要核对原片第 14 秒时，先补齐帧再选择：

```sh
ffmpeg -i raw.mp4 -vf "fps=30,select='eq(n,420)'" -frames:v 1 frame-14s.png
```

这里的时间是原片时间。与成片比较时，还需扣除该次 take 的裁剪起点；结束时的静止停留由合成参数补齐。

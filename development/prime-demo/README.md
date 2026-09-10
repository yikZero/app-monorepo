# Prime 权益演示视频

按 feature 保存配置，用真实 iOS 组件录制，再合成权益页使用的 MP4。默认设备 393×852，成片 1920×1200 / 30fps；渐变、手机框、镜头和点击提示沿用已确认的效果。

[Transaction security check 实战](TRANSACTION_SECURITY.md) · [Blockaid 风险示例](BLOCKAID_EXAMPLES.md) · [配置与新增 feature 指南](FEATURE_GUIDE.md) · [验收记录](VALIDATION.md) · [低层命令](LOW_LEVEL.md)

[最终上传版：Browser → Rewards → 风险与检查详情](output/features/transaction-security-check/deliveries/2026-09-10/prime-feature-transaction-security-check-20260910.mp4)（1.03 MB，19.83 秒，1920×1200）。[高质量合成版](output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z/demo.mp4) · [压缩与复现说明](UPLOAD.md)

## 日常使用

个人维护分支为 `yikZero/app-monorepo:yikzero/prime-transaction-security-video`，不向上游提交 PR。新机器先按 [迁移与安装说明](PORTABILITY.md) 恢复源码和素材；日常命令在所选仓库根目录运行。本机已验收的 checkout 仍为 `.worktrees/prime-transaction-security-video`，原 checkout 保留早期版本。

```sh
# 查看场景并检查配置
node development/prime-demo/demo.mjs list
node development/prime-demo/demo.mjs check transaction-security-check

# 检查后期工具，或完整录制环境
node development/prime-demo/demo.mjs doctor post
node development/prime-demo/demo.mjs doctor record

# UI、内容或真实操作变化：重录并合成
node development/prime-demo/demo.mjs record transaction-security-check

# 镜头、点击气泡或结束停留微调：复用原片
node development/prime-demo/demo.mjs render transaction-security-check --take latest
node development/prime-demo/demo.mjs render transaction-security-check --take TAKE_DIRECTORY --hold 4 --no-taps

# 画面认可后：一键压缩、抽封面、保存交付记录
node development/prime-demo/demo.mjs export APPROVED_MASTER.mp4 --crf 23

# 复现某次历史配置
node development/prime-demo/demo.mjs replay HISTORICAL_RENDER_DIRECTORY --take MATCHING_TAKE_DIRECTORY
```

每次输出到新目录，不覆盖旧版本。命令结束会打印产物位置。录制启动并关闭自己创建的 Metro 和 fixture 服务；只合成时不启动 App。

`latest` 选择当前 feature 最近成功的原片，不是最近认可的成片。“最终版”压缩使用明确的 MP4 路径。也可以把 `--take` 换成某次录制目录或 `take.json` 的路径，明确指定素材。此前 `output/takes/` 下的原片也可使用。

`export` 默认在合成 MP4 同目录的 `deliveries/<时间>/` 中生成 `video.mp4`、`poster.png`、`export.json`，也可用 `--output NEW_DIRECTORY` 指定新目录。它直接处理已认可的画面，不重录、不重算镜头、不改背景色；输出参数和来源摘要一起保存。参数见 [UPLOAD.md](UPLOAD.md)。

## Skill 与工具分工

Skill 的维护源是 `skill/onekey-prime-video/`，本机安装在 `~/.codex/skills/onekey-prime-video/`。可以直接说“用 `$onekey-prime-video` 重录 Transaction security check”，或描述要调整的镜头、内容和交付要求。Skill 负责选择操作、定位工作目录和按需读说明，脚本与参数只在仓库维护。

| 层级 | 入口 / 位置 | 日常是否直接调用 |
| --- | --- | --- |
| 日常命令 | `demo.mjs` 的 list / check / record / render / replay / export | 是 |
| 环境准备 | `demo.mjs` 的 setup / doctor / build-ios | 初次搭建或原生依赖变化时 |
| Feature 参数 | `features/<id>/` 与共用 `presets/` | 微调时编辑 |
| 采集与合成实现 | `run.mjs`、`compose.mjs`、`export.mjs`、`scripts/` | 入口内部调用；排查时再看 |
| 兼容入口 | `export-upload.sh`、旧 fixtures 与低层命令 | 保留旧命令，不新增一套实现 |
| 素材与试验 | `output/`、`.tmp/prime-demo/` | 本地留档，本轮不删除 |

Skill 不携带脚本副本。迁移机器时保留完整源码、原片、配置快照及构建记录。旧绝对路径快照使用 `replay --take` 指定搬迁后的同一份原片；新快照还保存相对原片位置。系统要求、素材归档和恢复验收范围见 [PORTABILITY.md](PORTABILITY.md)。

## 配置如何组织

```text
development/prime-demo/
  demo.mjs                          日常命令入口
  presets/
    prime-393x852.json               多个 feature 共用的构图
  features/
    transaction-security-check/
      feature.json                  场景、文件引用、操作节奏、结束停留
      fixture.json                  固定演示数据
      camera.json                   镜头绑定事件、移动时长、到位偏移、距离和曲线
      taps.json                     点击提示位置、时间、样式、开关
  output/
    features/<feature-id>/
      takes/<时间>/                 原片、节点、录制配置快照
      renders/<时间>/               成片、封面、参数、合成配置快照
        deliveries/<时间>/          export 的视频、封面和来源 / 编码记录
```

feature 配置里的相对路径以 `feature.json` 所在目录为起点。视频、运行日志及配置快照留在本地，`output/` 已被 Git 忽略；工具、feature 配置和资源随源码保留。

| 要调整什么 | 改哪里 | 是否重录 |
| --- | --- | --- |
| 金额、站点、账户展示数据 | `fixture.json` | 是 |
| Rewards 图标 | `apps/mobile/prime-demo/assets/rewards.svg`，导出同名 512×512 PNG | 是 |
| 真实操作及等待时间 | `feature.json` 的 `capture` | 是 |
| 结果停留时间 | `feature.json` 的 `compose`，或 `--hold` | 否 |
| 镜头速度、距离、加减速 | `camera.json` | 否 |
| 点击提示位置、轻重、时长、开关 | `taps.json`，临时隐藏用 `--no-taps` | 否 |
| 渐变、手机位置、边框、圆角 | `layout` 引用的 preset | 否 |
| 产品组件、页面结构或交互 | 对应源码与演示场景 | 是 |

Rewards 的书签、dApp 页头和签名页图标共用 `apps/mobile/prime-demo/assets/rewards.png`；编辑同目录 SVG 后导出为 512×512 PNG，再运行 `record transaction-security-check` 即可更新三处。

默认镜头绑定实际操作反馈：配置移动时长及事件前后到位的时间后，脚本会从每次原片的节点自动推算镜头开始时间。`arriveBefore` 表示提前到位，`arriveAfter` 表示事件发生后到位，二者选一。改快慢通常只需重新合成；隐藏点击提示不影响镜头。旧的绝对时间关键帧也继续支持。

每个场景可以配置自己的录制就绪节点。SignGuard 仍等待完整动画；没有动画的新场景只需报告目标页面可操作，无需产生扫光节点。

同一页面的不同数据或节奏可以复制 feature 目录维护。目前场景包含 SignGuard / Permit2 和 Transaction security check。前者保留旧样片兼容，后者使用本地 dApp 与固定 Prime 检测响应。另一套页面需要新增场景，真实点击优先复用 `capture.steps`。具体步骤见 [FEATURE_GUIDE.md](FEATURE_GUIDE.md)。

## 复现历史版本

普通 `render` 使用当前 feature 配置。要重新生成某次历史成片，使用其输出目录：

```sh
node development/prime-demo/demo.mjs replay development/prime-demo/output/features/signguard-permit2/renders/<时间>
```

替换 `<时间>` 为实际目录。`replay` 使用那次冻结的配置和原片，输出到新目录；当前 feature 后来改了金额、镜头或提示，不会替换历史参数。原片摘要会校验，避免误用其他录制。

通过新入口生成的 `takes/<时间>/` 目录也可直接交给 `replay`，重放录制时自动生成的成片。

每次输出保留生效配置、原片摘要、裁剪与停留参数、工具信息及源码状态。相同原片与工具版本可用于核对画面一致性；跨版本升级不会承诺字节完全一致。保留原片和快照，才能复现历史视频。

## 本机准备

需要仓库 Node/Yarn 依赖、Xcode / iOS Simulator、Detox、applesimutils、FFmpeg 和 ffprobe。本机已准备：

- 专用 iPhone 15 Pro 模拟器，逻辑 393×852。
- 模拟器包 `.tmp/prime-demo/native/OneKeyWallet.app`。
- fixture 服务端口 4737、Metro 端口 8081。
- 浅色、英文、关闭 Reduce Motion；录制时关闭工具自带触点圈。

换机器后可用 `PRIME_DEMO_UDID` 和 `PRIME_DEMO_APP_PATH` 指定匹配的模拟器与包。JS/TS UI 更新通常直接重录；原生依赖变化时需重建 `.app`。构建和低层参数见 [LOW_LEVEL.md](LOW_LEVEL.md)。

演示复用产品安全卡片和详情组件，外层为独立原生 sheet；未接入完整账户和签名流程。新场景从 Browser 首页书签打开 Rewards，真实加载本地 WebView、接收签名请求，随后使用固定响应展示风险。六次点击依次打开 dApp、发起领取、打开和关闭风险详情、打开和关闭检查项，最后回到风险卡片；风险复选框保持未勾选。画面使用虚构域名 `rewards.example.com`，本地传输地址保存在 `fixture.dapp.url`，站点状态为未验证。页面结构变化仍需同步调整演示场景。

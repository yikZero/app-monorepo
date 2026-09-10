# 配置一个可重复录制的 feature

一个 feature 目录对应一条演示脚本。每条视频的内容和节奏放在这里，共同的设备构图放在 `presets/`。先选择最接近的已实现场景。当前完整多步示例是 `transaction-security-check`；`signguard-permit2` 保留单次扫光的历史兼容场景。确认目标页面是否仍是同一场景，再决定是否需要新增原生实现。

## 配置放在哪里

| 文件 | 保存什么 | 修改后做什么 |
| --- | --- | --- |
| `feature.json` | 场景名称、文件引用、操作等待、裁剪节点偏移、结束停留 | 操作变化重录；结束停留只需合成 |
| `fixture.json` | 固定金额、文案、站点、账户展示信息 | 重录 |
| `camera.json` | 移动时间、距离、加减速曲线 | 重新合成 |
| `taps.json` | 提示开关、位置、出现时间、时长、颜色和不透明度 | 重新合成 |
| `presets/prime-393x852.json` | 公共渐变、画布、手机位置、边框和圆角 | 重新合成 |

当前统一使用 393×852 逻辑尺寸的设备、30fps、H.264 / yuv420p。公共构图以 640×400 为设计坐标，`outputScale: 3` 输出 1920×1200。手机宽度、边框、圆角等派生值由脚本计算；修改机身宽度时，不需要再分别修改屏幕和外边框宽度。

共享 preset 会影响所有引用它的 feature。只想调整某一个时，复制 preset 到该 feature 目录，并修改其 `layout` 引用。文件路径相对于 `feature.json`。

## 场景与录制参数

新权益优先参考 [Transaction security check 配置](features/transaction-security-check/feature.json) 和本文“多步点击”部分。其操作使用 `capture.steps`，页面就绪节点为 `browserReady`；图标、固定响应及完整流程见 [实战说明](TRANSACTION_SECURITY.md)。

以下表格专门说明 [SignGuard 兼容场景](features/signguard-permit2/feature.json)，扫光和风险复选框不是新 feature 的默认要求：

| 字段 | 当前值 | 含义 |
| --- | --- | --- |
| `id` | `signguard-permit2` | 与目录名一致，使用小写字母、数字和连字符 |
| `scene` | `signguard-permit2` | 已实现的原生页面与操作适配器；复制配置时可以保持不变 |
| `capture.interaction` | `risk-checkbox` | 真实勾选风险复选框；设为 `null` 可省略操作 |
| `capture.readyMarker` | `animationsComplete` | 当前场景何时可以继续操作；其他场景可使用自己的就绪节点 |
| `capture.requiredMarkers` | 当前场景的 sheet、卡片和两种动画节点 | 就绪时需要具备的其他节点；与就绪节点属于同一次场景 |
| `capture.waitAfterReadyMs` | `2200` | 就绪后，等待多少毫秒再操作，控制原片中的阅读停留 |
| `capture.startOffsetSeconds` | `-0.1` | 相对 sheet 出现节点的裁剪偏移，负数保留提前量 |
| `capture.endCushionSeconds` | `0.5` | 操作反馈后多录的时间；原片会按实际可用帧裁剪 |
| `compose.holdSeconds` | `2` | 在最后一帧追加静止停留，可用 `--hold` 临时覆盖 |

[fixture.json](features/signguard-permit2/fixture.json) 保存金额、标题和账户等展示字段。金额保留字符串格式，例如 `"0.01"`。现有图标资源为 Uniswap、ETH、USDT、USDC；更换站点或币种名称并不会自动补齐对应图标，需同步调整场景资源。风险等级和风险说明目前由场景实现提供，尚未作为 fixture 字段开放。

没有动画的场景不需要产生动画完成节点。适配器在目标控件可操作时报告自己的节点，再将 `readyMarker` 指向它；显式指定就绪节点时，`requiredMarkers` 可以为空。当前 SignGuard 的 `sceneReady` 表示风险复选框已经完成正尺寸布局，不代表所有图片或动画已结束。默认配置仍等待该样片的完整动画。只有依赖动画完成节点的配置才会关闭并检查模拟器的“减弱动态效果”。

旧配置中的 `waitAfterAnimationsMs` 继续兼容，不能与 `waitAfterReadyMs` 同时填写。旧配置未指定就绪条件时，沿用原 SignGuard 的动画条件，保证历史快照可读取。

## 调节节奏

默认 `camera.json` 按操作事件定位镜头：

```json
{
  "offsetUnits": "designPx",
  "initialY": 0,
  "moves": [
    {
      "marker": "riskAcknowledged",
      "arriveBefore": 1.3,
      "duration": 1.4,
      "y": 240,
      "easing": "ease-in-out"
    }
  ]
}
```

这里表示：移动用 1.4 秒，在选中反馈前 1.3 秒到达 `y: 240`。脚本从本次原片的实际事件时间倒推开始和到位时间。只改 `duration` 就能变快或变慢，无需同时重填两个绝对时刻；真实点击不移动。`y` 仍由作者设定，单位是构图的设计像素。

每个 move 必须在 `arriveBefore` 和 `arriveAfter` 中选一项，不能同时填写。`arriveAfter` 表示事件之后到位，用来在点击完成后再把镜头移回去。例如关闭覆盖信息后再用 0.8 秒回到顶部：`"arriveAfter": 1.6, "duration": 0.8, "y": 0`。旧配置只写 `arriveBefore` 时行为不变。

每个 move 可以选择 `linear`、`ease-in`、`ease-out`、`ease-in-out`、`smootherstep`。`smootherstep` 使用五次 S 曲线，起点与终点的速度、加速度都回到零，起停更柔和；不会越过目标位置。省略时仍使用原有 `ease-in-out`。多个 move 按顺序填写，移动区间不能重叠。若推算的开始时间早于原片裁剪起点，会明确报错；缩短移动、减少提前量或补录更长的阅读停留后再合成。

事件来自原片的 `take.json`，即使隐藏全部点击提示，镜头仍照常计算。`record`、`render`、`replay` 会自动传入该文件；直接使用低层 `compose.mjs` 时，事件镜头需要 `--take`。当前 `riskAcknowledged` 是已选中的反馈节点，不是手指刚按下的瞬间。

旧版 `keyframes` 继续支持：`at` 是裁剪后成片秒数，`y` 是设计像素，`easing` 写在运动开始的关键帧上。一个配置使用 `moves` 或 `keyframes` 其中一种；旧快照无需迁移。

`taps.json` 的坐标用整机逻辑像素，原点是屏幕左上角，包含状态栏。默认使用真实操作节点记录的位置；手填 `x` / `y` 仅调整气泡位置。`offset` 用于相对操作反馈节点提前或延后；`duration` 控制提示持续时间。单次提示和全部提示都能关闭。

例如把默认 move 的 `duration: 1.4` 改成 `2`，到位时间保持不变，开始时间自动提前 0.6 秒。修改 capture 等待时间会改变真实操作，需要重录；镜头会从新原片重新计算。

点击提示优先保留 `marker: "riskAcknowledged"`，随每次真实操作反馈定位；需要提前出现时可设 `offset: -0.1`。想手工定位，在该事件里增加 `x: 30, y: 742`；想完全按时间安排，用 `at` 替代 `marker` 和 `offset`。这些配置只改变提示，不会改变 App 的真实点击位置。

当前提示的 `radius: 14`、`opacity: 0.46`、`ringOpacity: 0.28` 和 `duration: 0.85` 是已确认的默认效果。`enabled: false` 可以写在配置顶层或某个事件内；若同时取消真实操作，应一并关闭依赖该操作节点的提示。

改动 `fixture.json` 后，只重新合成不会更新视频中的金额或文案，需要重录。合成使用的是原片已有的画面。

## 复制现有场景

选择与目标最接近的 `features/transaction-security-check/` 或 `features/signguard-permit2/` 复制为新目录，在 `feature.json` 中修改 `id`、标题和需要调整的文件。同一套页面换数据或节奏可以保留原 `scene`；不同页面仍需新增适配器，不能只改名称。

先运行入口的 `check` 命令确认配置，再录制。新的目录不应继续指向旧 feature 的 fixture、camera 或 taps，除非确实希望共享它们。

## 增加另一套真实页面

当前原生场景包含 SignGuard / Permit2 和 Transaction security check。后一条的完整示例见 [实战说明](TRANSACTION_SECURITY.md)。另一项权益如果使用不同页面，需要补充以下内容：

1. 演示场景：在 `apps/mobile/prime-demo/` 中组合真实产品组件和固定演示数据，接到演示入口。字段和图片尽量使用本地数据与资源。
2. 操作步骤：使用稳定的 testID 定位目标，优先配置下文的 `capture.steps`。实际操作由脚本执行。
3. 状态节点：报告场景需要的就绪和操作反馈节点；需要等待动画时，再报告动画结束。操作命令返回并不等于 UI 已完成，节点应来自页面实际状态。
4. 配置注册：让 feature 的 `scene` 对应到已实现的适配器，并添加 feature 目录。
5. 样片验收：检查第一帧、完整动画、点击对齐和最终停留；改变一项演示数据后重录，确认画面更新；关闭点击提示后，原片和成片都不应残留工具触点圈。

每次录制重新挂载场景，让初始状态及一次性动画复位。录制器先就绪，再进入演示；不依赖动画的场景不增加扫光等待。演示场景与真实账户、签名或广播保持明确边界。当前 Transaction security check 在关闭检查范围后回到卡片，不勾选风险复选框、不执行确认；旧 SignGuard 的勾选步骤仅属于该历史场景。

## 多步点击

`transaction-security-check` 使用 `capture.steps`，按数组顺序执行。它与旧的 `interaction: "risk-checkbox"` 互斥；新配置把 `interaction` 设为 `null`。

```json
{
  "id": "showRiskDetails",
  "testID": "sig-confirm-security-finding-tx-security-malicious_approval",
  "waitForTestID": "sig-confirm-security-finding-details",
  "holdMs": 3200
}
```

这一步等待风险行可点击，读取控件在设备上的位置，点击中心，等待真实详情出现，再留 3.2 秒阅读。每步必须选择一个等待条件：`waitForMarker`（当前场景的反馈事件）、`waitForTestID`（控件出现）、`waitForGoneTestID`（控件消失）。

默认点击控件中心。`point: {"x": 10, "y": 20}` 指定控件内位置；`pointMarker: "dappReady"` 从网页的就绪事件读取 `extra.localPoint`，用于 WebView 内按钮。两种位置来源不能同时填写。实际设备坐标自动写入 take，镜头与后期气泡不需要另填同一组坐标。

步骤 `id` 同时是镜头和提示可引用的节点名。它记录主机发起点击的时点，仍可能与设备实际呈现相差数帧；页面变化由独立的等待条件验证。SignGuard 的 `riskAcknowledged` 是复选框选中后的反馈，和发起勾选的步骤节点不同。Transaction security 默认在关闭覆盖信息后结束，不再勾选“自行承担风险”。

`capture.startMarker`、`capture.endMarker` 可以选择裁剪节点。新场景从 `browserReady` 开始，结束于 `closeCoverage`；相应偏移仍使用 `startOffsetSeconds`、`endCushionSeconds`。原有配置未填写这两个字段时保留历史行为。

新 feature 最常调整的是 `holdMs`、镜头的 `duration/arriveBefore/arriveAfter/y` 和提示的 `offset`。修改步骤等待需要重录；只改镜头或提示可直接重新合成。不要用固定延时替代“页面已出现”的等待条件。

## 历史版本怎么保留

原片、节点和每次合成的配置快照随输出目录保存。正常微调读取当前 feature 配置；复现历史版本使用那次输出中的快照，不依赖当前配置文件。

使用相同原片和工具版本，可以检查重新合成的画面是否一致。UI 更新后重录会得到新版画面；仅凭配置文件无法恢复旧版 App 的源码。保留原片是复现历史视频的基础，工具版本和源码摘要用于核对差异。

当前已接受的 SignGuard 原片开头约 0.6 秒先显示弹层标题，随后正文出现。这次整理保留该时序；后续若要求第一帧内容完整，应调整页面与动画准备节点，并重新验证扫光开头，而不是直接裁掉动画的一部分。

## 认可画面后导出

对本次认可的合成 MP4 执行 `demo.mjs export`，一次生成上传视频、首帧封面和交付记录。压缩不重新读取 feature 配置，因此不会把刚刚修改、尚未认可的参数混入成片。背景保留已确认的配色，具体命令见 [UPLOAD.md](UPLOAD.md)。

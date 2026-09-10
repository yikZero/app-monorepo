# Prime 权益演示视频

本文保留低层录制与合成命令，供排查和兼容已有脚本。日常按 feature 录制、微调及复现，请从 [README](README.md) 开始；日常数据和镜头配置使用 `features/<id>/` 下的文件。

固定演示数据 → Detox 点击真实 iOS 组件 → simctl 录屏 → FFmpeg 合成绿底、手机框和结果停留 → MP4。

以下低层命令默认使用 SignGuard / Uniswap Permit2，复用安全卡片、资产预览和动画组件，外层使用独立的原生 sheet。新权益 Transaction security check 请用 [feature 入口](TRANSACTION_SECURITY.md)，其中没有扫光。演示不创建钱包、不签名、不发送交易，覆盖的是展示与录制流程。

当前成片为 1920×1200，按 640×400 设计坐标等比例放大 3 倍。[点击提示样片](output/signguard-permit2-hd-taps-v3.mp4) · [隐藏提示对照](output/signguard-permit2-hd-taps-hidden-v2.mp4) · [固定镜头对照](output/signguard-permit2-hd-static-v2.mp4) · [验收记录](VALIDATION.md)。

## 本机重录

在仓库根目录运行：

```sh
node development/prime-demo/run.mjs
```

脚本会启动专用模拟器及本地服务，录制、合成，结束后关闭自己启动的服务。每次保存独立目录：

```text
development/prime-demo/output/takes/<时间>/
  raw.mp4       原片
  take.json     演示数据、文件摘要、动画节点、裁剪时间
  demo.mp4      合成视频
  demo.png      最终画面封面
  demo.json     合成参数与视频规格
```

视频和日志留在本地，已被此目录的 `.gitignore` 排除。源码、fixture 和资源图片可以随仓库保存。

## 改内容和节奏

修改 [permit2-uniswap.json](fixtures/permit2-uniswap.json) 中的金额、账户名称或展示内容，再运行录制命令。每次都会重新读取文件，并将当次数据保存到 `take.json`。

```sh
# 追加 4 秒稳定画面，并按配置向下移动镜头
node development/prime-demo/run.mjs --hold 4 --camera development/prime-demo/fixtures/camera-signguard.json

# 连续生成 3 份，检查重复录制
node development/prime-demo/run.mjs --repeat 3
```

已有满意的原片，只改停留或镜头时，读取该次 `take.json` 的 `video.startSeconds` 和 `video.actualEndSeconds`，直接重新合成：

```sh
node development/prime-demo/compose.mjs \
  --input development/prime-demo/output/takes/<时间>/raw.mp4 \
  --output development/prime-demo/output/takes/<时间>/demo-hold4.mp4 \
  --start <video.startSeconds> \
  --end <video.actualEndSeconds> \
  --hold 4 \
  --camera development/prime-demo/fixtures/camera-signguard.json \
  --poster development/prime-demo/output/takes/<时间>/demo-hold4.png
```

尖括号中的内容需要替换为实际路径或数值。重新合成不启动 App，不需要再录一遍。

镜头配置在 [camera-signguard.json](fixtures/camera-signguard.json)：`at` 是裁剪后成片的秒数，`y` 是向下看的距离，单位沿用 640×400 设计像素。当前示例在 4.3 秒前保持原位，4.3～5.7 秒下移 240px，再保持到结束。省略 `--camera` 即固定镜头。

距离不变时，持续时间更长则更慢，更短则更快。例如把结束点从 5.7 改到 6.7，同样下移 240px 会从 1.4 秒变成 2.4 秒。`easing` 写在**起始**关键帧上，只控制到下一关键帧的曲线；省略则为 `ease-in-out`（与现有默认平滑相同）。

| easing | 曲线 |
| --- | --- |
| `linear` | 匀速 |
| `ease-in` | 先慢后快，逐渐加速 |
| `ease-out` | 先快后慢，逐渐减速 |
| `ease-in-out` | 缓慢起步，中间加快，再缓慢停下；当前默认 |
| `smootherstep` | 五次 S 曲线，起停的速度与加速度归零，缓入缓出更柔和，无回弹 |

曲线控制的是框内录屏画面的移动。手机框、圆角遮罩和背景固定，录屏中的状态栏和标题随内容移动。镜头按预设时间轴播放，不自动追踪点击；真正的 App 滚动或点击需写入录制步骤。`--hold` 追加的是原片最后一帧，镜头仍可在这段时间移动。当前构图最多下移 246px，超出会限制在此范围，避免露出空白。

## 点击指示

半透明白圆（46% 不透明度）加浅灰绿涟漪 `#A8B3AE`（28% 不透明度），约 0.85 秒柔和淡入后轻按再扩散淡出。坐标用整机逻辑像素 393×852（不是 640 设计坐标）。指示画在**完整录屏**上，再随镜头裁切，因此会跟着画面走，移出窗口即消失，不会画到边框外。

录制时通过 `detoxDisableTouchIndicators: 1` 关闭 Detox 自带的触点圈，避免原片与后期气泡叠加。此前未关闭此选项的原片需重录一次；使用新版干净原片后，提示样式和开关仍只需重新合成。

录制真实复选框点击，并生成带提示的样片：

```sh
node development/prime-demo/run.mjs \
  --hold 2 \
  --camera development/prime-demo/fixtures/camera-signguard.json \
  --taps development/prime-demo/fixtures/taps-signguard.json \
  --interaction risk-checkbox
```

`--interaction risk-checkbox` 控制真实点击，与提示开关独立。SignGuard 默认等待扫光结束，再点击风险复选框；页面选中后记录 `riskAcknowledged` 节点和触点位置。它不点击 Confirm。多步流程可使用 `capture.steps`，按控件 testID 和页面反馈节点配置，见 [FEATURE_GUIDE.md](FEATURE_GUIDE.md)。

已有包含该点击的原片，可以直接重新合成：

```sh
node development/prime-demo/compose.mjs \
  --input development/prime-demo/output/takes/<时间>/raw.mp4 \
  --output development/prime-demo/output/takes/<时间>/demo-taps.mp4 \
  --start <video.startSeconds> \
  --end <video.actualEndSeconds> \
  --hold 4 \
  --camera development/prime-demo/fixtures/camera-signguard.json \
  --taps development/prime-demo/fixtures/taps-signguard.json \
  --take development/prime-demo/output/takes/<时间>/take.json \
  --poster development/prime-demo/output/takes/<时间>/demo-taps.png
```

配置见 [taps-signguard.json](fixtures/taps-signguard.json)。省略 `--taps`、将顶层 `"enabled"` 改为 `false`，或禁用全部事件，即可隐藏提示。原片里的实际点击仍然保留。同一原片和合成参数下，隐藏提示的画面与未添加此功能时一致。

用 `marker` 时必须同时给 `--take`，且 `take.json` 的 `rawHash` 要与 `--input` 一致。时间：`(marker.receivedAtMs - recordingStartedMs) / 1000 - --start + offset`，并只使用 `matchedSceneKey` 下的节点。也可改用 `at`（裁剪后成片秒数），与 `marker` 不能同时写。

默认配置**不写 x/y**，合成时使用录制节点中保存的触点位置。也可以手填设备坐标，原点在屏幕左上角，包含状态栏区域。例如：

```json
{ "id": "risk-checkbox", "marker": "riskAcknowledged", "x": 28, "y": 742, "duration": 0.85 }
```

当前脚本通过控件的屏幕位置加控件内点击位置计算坐标，每次录制重新读取。样片的实际位置为 `(30, 742)`；不直接使用 React 根视图坐标，避免原生 sheet 和状态栏造成偏移。节点时间来自页面选中后的回调，实际显示可能相差数帧；首轮逐帧检查约为 62ms。

手填 x/y 只覆盖气泡位置，不改变脚本实际点击的控件。`offset` 控制相对于页面反馈节点的时间：`0.1` 表示晚 0.1 秒，`-0.1` 表示提前 0.1 秒。每个事件的 `duration` 控制提示持续时间。全局还可调半径、填充色和透明度，以及圆环颜色和透明度，分别对应 `style.radius` / `color` / `opacity` / `ringColor` / `ringOpacity`。修改这些参数可复用原片。

## UI 更新后

| 修改内容                     | 操作                                             |
| ---------------------------- | ------------------------------------------------ |
| 金额、账户、展示数据         | 改 fixture，再录制                               |
| 已复用的产品组件、样式、动画 | 更新源码，再录制                                 |
| 页面字段结构、导航、交互     | 同步调整 apps/mobile/prime-demo 中的场景，再录制 |
| 绿底、手机框、停留、镜头或点击提示 | 调整合成参数、camera 或 taps JSON，复用原片 |
| React Native、Expo、原生依赖 | 重建匹配版本的模拟器 .app，再录制                |

组件内部的 UI 改动会随源码更新。生产确认页的字段增删、页面结构和导航变化，仍需同步到独立演示场景；任意页面改动不会全部自动跟随。

## 首次准备

日常准备优先使用 `demo.mjs setup`、`demo.mjs build-ios --install-pods` 和 `demo.mjs doctor record`，完整步骤见 [PORTABILITY.md](PORTABILITY.md)。下面保留本机路径和低层命令，主要用于排查。

需要 macOS、Xcode、iOS Simulator，以及仓库的 Node/Yarn 依赖、Detox、applesimutils、ffmpeg、ffprobe。依赖应与 yarn.lock、Podfile.lock 和模拟器包一致。

本机默认：

- 模拟器 OneKey Prime Demo 393x852（iPhone 15 Pro，逻辑 393×852，截图 1179×2556，3 倍像素密度）：231FF367-DF91-4F64-AEB0-A56ABE437CBE。simctl 的 H.264 原片宽度取偶数，实际为 1178×2556。
- 已准备的包：.tmp/prime-demo/native/OneKeyWallet.app。
- fixture 服务 127.0.0.1:4737；Metro 127.0.0.1:8081。
- 浅色、英文，关闭 Reduce Motion。

缺少包时，先构建，再用 --app-path 指定产物：

```sh
yarn workspace @onekeyhq/mobile detox:build:ios:sim:debug

node development/prime-demo/run.mjs \
  --app-path apps/mobile/ios/build/detox/Build/Products/Debug-iphonesimulator/OneKeyWallet.app
```

可用 `--udid <模拟器 ID>` 指定其他专用模拟器。录制会安装演示包，应使用专门用于演示的模拟器。

本次更新到最新 x 后，旧包缺少 `OneKeyImageCache` 原生模块，需要重建。当前 worktree 的可用包已放在默认 `.tmp/prime-demo/native/OneKeyWallet.app`。独立构建也可以使用以下命令，先完成仓库依赖和 CocoaPods 安装，再在仓库根目录执行：

```sh
SKIP_BUNDLING=1 SENTRY_DISABLE_AUTO_UPLOAD=true ENABLE_NATIVE_BACKGROUND_THREAD=false \
xcodebuild \
  -workspace apps/mobile/ios/OneKeyWallet.xcworkspace \
  -scheme OneKeyWallet -configuration Debug -sdk iphonesimulator \
  -destination 'id=231FF367-DF91-4F64-AEB0-A56ABE437CBE' \
  -derivedDataPath .tmp/prime-demo/native-build \
  -jobs 8 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO

codesign --force --sign - \
  .tmp/prime-demo/native-build/Build/Products/Debug-iphonesimulator/OneKeyWallet.app/Frameworks/GPChannelSDKCore.framework/GPChannelSDKCore

codesign --force --deep --sign - \
  .tmp/prime-demo/native-build/Build/Products/Debug-iphonesimulator/OneKeyWallet.app

node development/prime-demo/demo.mjs record transaction-security-check \
  --app-path .tmp/prime-demo/native-build/Build/Products/Debug-iphonesimulator/OneKeyWallet.app
```

`SKIP_BUNDLING` 仅省略打包内置 JS，录制时由脚本启动演示 Metro。原生模块版本必须与当前依赖一致；本次排查曾发现安装目录中的 Nitro 为 0.36.5，而锁文件要求 0.37.0，导致缺少 `ReactProp.hpp`。修复安装内容并重新执行 Pods 安装后构建通过，未修改依赖版本或产品代码。实际构建的 Pods 锁文件已保存到 `environment/Podfile.lock`；旧 `.tmp/Podfile.lock.local-demo-build` 仍保留。新构建入口在安装 Pods 时明确设置 `RCT_USE_RN_DEP=0` / `RCT_USE_PREBUILT_RNCORE=0`，匹配这份锁文件的源码依赖模式，并在退出时恢复运行前的 Podfile.lock 和 Xcode 工程文件。这不是生产依赖升级。

手动关闭 Xcode 签名时，须先为包内的 `GPChannelSDKCore` 二进制签名；本机仅执行根包的 `codesign --deep` 会遗漏它，启动时出现 `Trying to load an unsigned library`。使用 Xcode 正常签名流程构建的包无需重复这一步。

端口被占用时会提示并退出。如果占用者就是已启动的 Prime 演示服务，可加 `--reuse-services`；脚本不会关闭已有服务。普通钱包模式的 Metro 不能作为演示 Metro 复用。

## 录制约定

PRIME_DEMO_ENABLED=true 选择演示入口；SIMCTL_CHILD_ENABLE_NATIVE_BACKGROUND_THREAD=false 关闭原生钱包后台。演示存储使用内存适配器，生产钱包的校验和存储逻辑保持原样。

先等待录制器就绪，再打开场景。动画结束由真实完成回调报告，不按点击命令返回时间估算。原始节点和视频帧信息会保存到 take.json；模拟器原片允许可变帧率，成片统一转为 30fps。

成片为 1920×1200、H.264、yuv420p、30fps、无音轨，并启用 faststart。直接使用原片合成高清画面。背景竖向渐变为 `#39DB00` → `#00C9A5`。

| 构图 | 640×400 设计坐标 | 1920×1200 输出坐标 |
| --- | --- | --- |
| 机身 | 宽 288，x176、y48，圆角 43 | 宽 864，x528、y144，圆角 129 |
| 内边框 | 黑色，8px | 黑色，24px |
| 屏幕 | 宽 272，圆角 35 | 宽 816，圆角 105 |
| 外描边 | 黑色 20%，4px，圆角 47 | 黑色 20%，12px，圆角 141 |

设备下半部分超出画布。完整屏幕画面缩到 816×1770，在固定的 816×1032 窗口内裁切。公共布局位于 `presets/prime-393x852.json`，由 `layout.mjs` 校验并推算。

启动日志位于 output/.startup/<时间>/，每次录制另有 capture.log。

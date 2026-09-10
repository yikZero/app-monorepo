# 保存环境与换机复用

个人工具源码维护在 `yikZero/app-monorepo` 的 `yikzero/prime-transaction-security-video` 分支，不创建上游 PR。这个 fork 本身是公开仓库。素材另存为该仓库的 Draft Release，下载时使用有权限的 GitHub 账号。

## 平台边界

| 操作 | 需要什么 | 本轮验证范围 |
| --- | --- | --- |
| `record`、重建 iOS `.app` | macOS、Xcode、iOS Simulator、Detox、applesimutils、仓库依赖 | Apple Silicon Mac |
| `list` / `check` | Node、工具和配置文件 | Mac |
| `render` / `replay` | Node、FFmpeg / ffprobe、原片和快照 | Mac，不启动 App |
| `export` | Node、FFmpeg / ffprobe、POSIX `sh`、合成母版 | Mac，不启动 App |

当前录制直接使用 `xcrun simctl` 和 Detox 的 iOS Simulator 驱动，因此需要 Mac。[Apple 系统要求](https://developer.apple.com/xcode/system-requirements) 和 [Detox 环境说明](https://wix.github.io/Detox/docs/introduction/environment-setup/) 给出了对应依赖。

后期没有 iOS 运行时依赖，FFmpeg 路径可通过 `FFMPEG` / `FFPROBE` 或 PATH 指定。Linux、Windows WSL 的后期运行仍未验收；Windows 原生终端还需处理 `sh`。不将这些平台标为已支持的录制环境。

## 从 GitHub 恢复源码与 Skill

```sh
git clone --branch yikzero/prime-transaction-security-video --single-branch \
  https://github.com/yikZero/app-monorepo.git app-monorepo-prime-video
cd app-monorepo-prime-video
```

安装 Node（仓库要求 ≥22.12.0）、仓库指定的 Yarn 4.12.0，以及包含 libx264 和所需滤镜的 FFmpeg。然后在仓库根目录检查后期工具：

```sh
node development/prime-demo/demo.mjs doctor post
node development/prime-demo/demo.mjs list
node development/prime-demo/demo.mjs check transaction-security-check
```

仅合成与压缩无需安装整个 App 的 Node 依赖。录制和构建需要执行下面的原生准备步骤。

Skill 的维护源随源码保存，本机全局目录是安装副本：

```sh
mkdir -p ~/.codex/skills
cp -R development/prime-demo/skill/onekey-prime-video ~/.codex/skills/
```

之后可以说“用 `$onekey-prime-video` 重录一个权益”。更新 Skill 时修改仓库源，再同步安装副本。不要假设旧机器用户名、仓库绝对路径或模拟器 ID 在新机器仍有效。

## 下载和恢复素材

素材归档名为 `prime-video-media-20260910.tar.gz`，对应 Draft Release 标签 `prime-video-kit-2026-09-10`。先登录有该仓库权限的 GitHub 账号，再在一个新目录下载：

```sh
gh release download prime-video-kit-2026-09-10 --repo yikZero/app-monorepo \
  --pattern 'prime-video-media-20260910.*' --dir .tmp/prime-demo/restore
```

在下载目录执行：

```sh
shasum -a 256 -c prime-video-media-20260910.sha256
tar -xzf prime-video-media-20260910.tar.gz
```

解包后得到 `prime-video-media/`：

- `current/output/`：当前 Transaction security check 和兼容 SignGuard 的素材。
- `legacy/output/`：原 checkout 的早期 SignGuard 素材。
- `ARCHIVE.json`：495 个文件的相对位置、大小和 SHA-256。

归档包含原片、take.json、配置快照、合成母版、上传版、封面和检查 JSON，总文件大小约 122 MB，压缩归档约 118 MB。录制日志、服务日志、App 二进制及依赖缓存不在此归档内。

将 `current/output/` 的内容复制到新仓库 `development/prime-demo/output/`，保持原有层级。`legacy` 单独保留，按明确的 take 路径使用，避免把旧场景混入当前 feature 的 latest 选择。

## 搬迁后重放

新 snapshot 保存从 snapshot 目录到原片的相对路径，同时兼容原有绝对路径字段。整体搬迁 take / render 所在的 feature 输出树后，相对关系保持不变。

旧 snapshot 仍可能带有旧机器的绝对路径。用 `--take` 明确提供搬迁后的同一份原片：

```sh
node development/prime-demo/demo.mjs replay \
  development/prime-demo/output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z \
  --take development/prime-demo/output/features/transaction-security-check/takes/2026-09-10T01-01-27-342Z
```

重定位仍要求原始 SHA-256 匹配，使用历史 snapshot 的节点和合成配置；不能通过换一份 take 的节点或修改摘要来冒充历史重放。普通 `render --take` 读取当前 feature 参数，适合继续微调；`replay` 使用冻结参数，适合恢复旧版。

压缩直接读取认可的母版：

```sh
node development/prime-demo/demo.mjs export \
  development/prime-demo/output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z/demo.mp4
```

## 在 Mac 准备录制

1. 安装兼容的完整 Xcode、命令行工具及 iOS Simulator runtime。默认选择已验收的 iOS 26.5；有意换 runtime 时通过 `setup --runtime <ID>` 明确指定，并重新检查页面外观。
2. 安装 Node / Yarn 依赖：在仓库根目录运行 `yarn install --immutable`。仓库 postinstall 负责必要的生成资源；缺少注入资源时按项目说明运行 `yarn copy:inject`。
3. 安装 applesimutils 和 FFmpeg；Detox 的 iOS 工具可使用 `brew tap wix/brew` 后 `brew install applesimutils`。安装与 `environment/Podfile.lock` 的 COCOAPODS 字段匹配的 CocoaPods，当前为 1.17.0。
4. 运行 setup，找到或创建专用 iPhone 15 Pro，设备逻辑尺寸 393×852。setup 不启动模拟器，也不下载 Xcode 或 runtime。
5. 按本仓库的构建配方安装 Pods、构建并签名，再运行 doctor record 和正式录制。

```sh
node development/prime-demo/demo.mjs setup
node development/prime-demo/demo.mjs build-ios --install-pods
node development/prime-demo/demo.mjs doctor record
node development/prime-demo/demo.mjs record transaction-security-check
```

setup 将本机设备配置写到 Git 忽略的 `output/.environment.json`。这是机器本地配置，新机器应重新 setup，不复制旧 UDID。显式 `--udid` / `--app-path` 和对应环境变量可覆盖默认目标。

`build-ios` 每次临时使用本工具保存的 Pods 锁文件，并设置 `RCT_USE_RN_DEP=0` / `RCT_USE_PREBUILT_RNCORE=0`，按锁文件对应的 RN 源码依赖模式执行 `pod install --deployment`。已有依赖会复用缓存，`--install-pods` 保留为兼容参数。退出时恢复原有 `apps/mobile/ios/Podfile.lock` 和 `OneKeyWallet.xcodeproj/project.pbxproj`，包括运行前已有的本地修改，不提交生产锁文件或工程的生成变更。

`Pods/` 缓存保留演示依赖，下一次演示构建会重新执行锁定安装与工程集成。若在同一 checkout 切回正常 App 原生构建，先按项目原生流程重新安装生产 Pods；推荐专用 checkout，避免两种构建交替使用缓存。

构建输出到独立的 `.tmp/prime-demo/native-build`，采用已验收的 `SKIP_BUNDLING=1`、`SENTRY_DISABLE_AUTO_UPLOAD=true` 和关闭原生后台线程的配置，随后为嵌套 GPChannelSDKCore 和完整 App 做 ad-hoc 签名。成功产物放到默认 `.tmp/prime-demo/native/OneKeyWallet.app`。Debug 包仍需演示 Metro，不是离线视频或可直接替代源码的独立应用。

仅改 JS 页面或 fixture 时通常无需重建原生包。React Native、Expo 或原生依赖发生变化时，重建匹配的包。旧包可以保留作为缓存，但不能跨架构或依赖版本直接视为可用。

## 已保存的构建依据与验收

- `environment/reference.json`：本机实际版本、设备和构建参数；是参考组合，不是最低版本要求。
- `environment/Podfile.lock`：实际构建使用的完整锁文件，SHA-256 为 `cc693a67cc4542d5d3786feb3e178d7cca21841bbd0003b3250dbd339acf5f1c`，与当次 `Pods/Manifest.lock` 一致。
- `skill/onekey-prime-video/`：可以从 GitHub 重新安装的 Skill 源。
- [VALIDATION.md](VALIDATION.md)：代码检查、素材完整性和恢复演练的实际结果。

环境预检只能证明已检查项满足条件，不能替代真实构建与录制。新 Mac 首次录制仍需检查第一帧、完整 Checking、风险详情、检查范围、结束未确认签名，以及服务退出情况。跨 FFmpeg 或原生版本不保证像素、时序或文件字节完全一致。

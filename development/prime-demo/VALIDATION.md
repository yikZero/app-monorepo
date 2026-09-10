# Prime 演示视频验收

## 环境保存与迁移修复（2026-09-10）

- 增加 `doctor post / record`、`setup` 和 `build-ios`。setup 使用专用 iPhone 15 Pro，并把当前机器 UDID 存到被 Git 忽略的 `.environment.json`；不沿用其他机器的 UDID，也不自动下载 runtime。Skill 的维护源随仓库保存，安装副本不再依赖原机器绝对路径。
- 新快照保存原片相对路径；旧快照可用 `replay --take` 重定位到同一份原片，仍校验 SHA-256，并使用历史节点和合成配置。独立将媒体树解包到新目录重放，确认实际读取新路径；重放后的完整 MP4 SHA-256 与已认可母版一致：`5d9793ecb9ecdb22c1db1c3dbbc923484fbefda841999b3a917db3077ea329af`。
- 素材归档包含 495 个文件，逐文件解包与摘要验证通过。归档为 117,987,215 字节，SHA-256 为 `0b79562ab784a7592a9daddead2bf57137b3f76a6d82564d2f7b6685a7608fe3`。保留 current 和 legacy 两组历史素材，不含 App、依赖缓存、服务日志或机器环境配置。
- 主助手实际运行锁定 Pods 安装、iOS Debug 构建和 ad-hoc 签名；`codesign --verify --deep --strict` 通过。实际安装发现并补齐 `RCT_USE_RN_DEP=0` / `RCT_USE_PREBUILT_RNCORE=0`，匹配保存的源码依赖锁。随后补齐 Xcode 工程与锁文件的临时保存 / 恢复，避免后续构建混用依赖模式。
- 使用新构建默认 App 实际运行 `record transaction-security-check` 成功，新 take 为 `2026-09-10T03-06-34-371Z`。六步真实点击完整，Checking 的三项均 pending，结果一起变为 Risk；原风险确认未勾选。已抽帧查看首页、Checking、风险卡片、详情、检查范围和末帧。回归片为 1920×1200、H.264、yuv420p、30fps、597 帧、19.9 秒；只用于环境验收，没有替换已认可的最终片。
- 录制结束后 4737 / 8081 端口释放，专用模拟器已关闭。原 checkout 的已有改动、当前 feature 的四份参数、最终母版及上传版保留。
- 主助手独立运行全部 127 项 Node 测试，全部通过，无跳过。新增 5 项构建入口测试在临时目录使用命令替身，覆盖默认锁定安装、兼容参数、成功 / 失败恢复本地修改和缺失工程时提前退出；这些测试不调用真实 Pods 或 Xcode。
- `yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T03-20-26-137Z`。随后仅补充本验收记录。
- 原生验证在当前 Apple Silicon Mac 进行，复用已有 Node / Pods / DerivedData 缓存；尚未在第二台全新 Mac 或 Linux / Windows 验收。后期恢复不要求启动 iOS，也不要求安装完整 App 依赖。

## 本地 Skill 与统一入口（2026-09-10）

- 本机 Skill 位于 `~/.codex/skills/onekey-prime-video/`，只负责定位 checkout、选择录制 / 合成 / 导出操作及读取对应说明。脚本、feature 配置、preset 和资源继续在仓库维护，没有复制进 Skill。
- 日常入口统一为 `demo.mjs` 的 `list / check / record / render / replay / export`。旧低层入口和历史素材保留；当前多步场景作为新 feature 的参考，旧 SignGuard 扫光流程明确标为兼容场景。
- 新 `export` 调用已验收的 `export-upload.sh`，一次输出视频、首帧封面和交付记录，既不重录，也不重新计算镜头。主助手实际用含空格的交付路径导出，MP4 与原最终上传版的完整 SHA-256 一致，仍为 1,031,266 字节、595 帧、19.833333 秒；再次使用同一目录被拒绝，三个产物摘要保持不变。
- 交付记录保存编码脚本正文及摘要，已独立核对与当前脚本相同。输入检查要求真实帧数、完整帧率和色彩信息，输出检查帧数、时长及目标格式；不以时长猜测帧数。
- 修正两处把已调整过的停留时长写死的旧测试，改为检查有效配置及解析结果；已确认的 feature 参数没有变化。主助手运行全部 105 项 Node 测试，全部通过且无跳过；`yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T02-23-00-022Z`。本机 Skill 通过 `quick_validate.py`，引用的工作目录与文档已核实存在。随后仅补充本验收记录。
- 原片、已确认的高质量合成版和上传版保留，没有改背景、设备构图、场景内容或录制节奏。本轮没有启动模拟器和录制服务，也没有上传、提交或推送。

## 最终上传版压缩（2026-09-10）

[上传 MP4](output/features/transaction-security-check/deliveries/2026-09-10/prime-feature-transaction-security-check-20260910.mp4) · [首帧封面](output/features/transaction-security-check/deliveries/2026-09-10/prime-feature-transaction-security-check-20260910-poster.png) · [实际参数和检查数据](output/features/transaction-security-check/deliveries/2026-09-10/prime-feature-transaction-security-check-20260910.json)

- 核对现有 8 个权益视频，沿用 MP4 / avc1、H.264 High Level 5.0、1920×1200、30fps、yuv420p、BT.709 matrix / primaries / transfer、limited range、无音轨。MP4 的 moov 位于 mdat 之前，可渐进加载。
- 使用已验收的 1.8.0 合成版，x264 slow / CRF 23 压缩，由 1,736,100 字节降至 1,031,266 字节，约减少 40.6%。595 帧和 19.833333 秒保持不变，镜头及点击没有重新计算。
- 按用户最终确认，不调整背景色，也不依据旧视频取样替换背景。撤掉背景校正脚本，仅保留简短的 `export-upload.sh`。`setparams` 只补齐帧色彩标记；补齐前后的压缩视频 595 帧解码摘要全部一致。
- 手机内容区域与高质量合成版的 SSIM 为 0.998784；已抽帧查看风险详情的文字。背景五个高度的 RGB 取样保留原渐变，仅存在轻微有损压缩量化误差，具体数值见检查数据。SSIM 用于压缩对照，不代替不同设备的实际播放观感。
- `sh -n` 及实际脚本导出成功；独立核对文件编码、色彩标记、帧数、时长与 faststart。高质量合成版、原始录屏及快照保留，后续可重新导出。复现命令见 [UPLOAD.md](UPLOAD.md)。

## 镜头起停柔化（2026-09-10）

[当前成片](output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z/demo.mp4) · [冻结的合成参数](output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z/demo.json) · [复用的原片和节点](output/features/transaction-security-check/takes/2026-09-10T01-01-27-342Z/take.json)

- 合成器 1.8.0 增加可选 `smootherstep` 五次 S 曲线。起点和终点的速度、加速度归零，无回弹；原有四种曲线及默认 `ease-in-out` 保持兼容。
- Transaction security check 的四次镜头移动由 0.8 秒改为 1 秒，提前 0.2 秒出发。到位时间仍为 9.177、13.601、15.146、18.846 秒，目标位置仍为 230、0、230、0 设计像素。点击节点、风险详情及检查范围到位后的阅读停留保持不变。
- 使用同一份原片重新合成，未重录 App。独立比较新旧参数，确认原片 SHA-256、裁剪、结束停留、点击样式与事件、构图和渐变一致。新片仍为 1920×1200、H.264、yuv420p、30fps、595 帧、19.833333 秒，无音轨。
- 已查看移动途中、风险详情、检查范围和最后一帧，固定机框及内部裁切正常。曲线的实际 FFmpeg 像素采样与独立计算值一致，另有上行、下行的单调与不越界检查；动态观感以新视频为准。
- 主助手独立运行镜头、点击及可变帧率测试，44 项全部通过；`yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T01-24-01-020Z`。随后仅更新当前样片链接及本验收记录。

## 卡片收敛与权益页节奏（2026-09-10）

[当前成片](output/features/transaction-security-check/takes/2026-09-10T01-01-27-342Z/demo.mp4) · [原片和节点](output/features/transaction-security-check/takes/2026-09-10T01-01-27-342Z/take.json)

- 演示模型仅过滤卡片主体的 `site-unknown` 行，仍显示高风险 spender 和 Permit 提醒。Site security 的 unknown / Unverified 保留在检查范围弹层，站点没有改为已认证。生产卡片、检测模型、confirmation 和 acknowledgementKey 的计算未改。
- 缩短首页、领取页、检测及重复返回等待，风险详情的 3200ms 额外阅读等待保留。六次真实点击均成功，风险复选框未勾选。镜头仍按事件推算，保留 0.8 秒缓入缓出；检查范围提前 2.5 秒到位，关闭后 1.2 秒回到卡片。
- 旧片 23.733333 秒，新片 19.833333 秒，减少 3.9 秒。风险结果从第 6.038 秒提前至第 4.451 秒。输出 1920×1200、H.264、yuv420p、30fps、595 帧，无音轨。
- 本次节点区间：首页就绪到点击 0.792 秒；dApp 可见到领取 1.043 秒；Checking 到结果 1.085 秒；结果到查看详情 2.785 秒；风险详情打开到关闭 4.741 秒；检查范围打开到关闭 3.645 秒。打开到关闭的时间包含原生转场和镜头移动，不等同于稳定阅读时间；风险详情和检查范围在镜头到位后分别保留约 2.8 秒、2.5 秒再点击关闭。
- 已查看首帧、dApp、Checking、两条结果、风险详情、检查范围和最后一帧。卡片内 Unverified 已移除，检查范围内仍为 Unverified；文字没有被裁掉，结束遮罩已消失。数秒停留用于扫读重点，不能视为逐字读完所有说明的验收，依据与参数见 [节奏说明](TRANSACTION_SECURITY.md#权益页视频节奏)。
- 主助手独立运行 7 项模型测试、feature 预检及 `yarn agent:check --profile commit` 全部通过。检查日志为 `node_modules/.cache/agent-checks/2026-09-10T01-01-28-273Z`；之后仅更新当前样片链接和本说明。

## 统一 Checking 后展示结果（2026-09-10）

[当前成片](output/features/transaction-security-check/takes/2026-09-10T00-49-06-578Z/demo.mp4) · [原片和节点](output/features/transaction-security-check/takes/2026-09-10T00-49-06-578Z/take.json)

- 核对真实 `MessageConfirm`、`securityCheckModel` 和 `SecurityCheckHeader`：解析消息时页面显示骨架屏；卡片出现后，已有本地 Permit Warning 或其他结果时会先展示该结论，未完成的检查继续转圈。只有尚无结论等条件下才显示 `Checking...`，并非固定先 Checking 再 Warning。
- 仅调整演示模型的输入时机：等待期间暂不传入站点结果、消息展示和 unsignedMessage，三项 coverage 均为 pending，由真实产品模型自然返回 loading 和空 findings。`scanDelayMs` 到时后一次性传入完整数据，最终高风险 spender、Permit 提醒、Unverified 与确认状态保持原样。没有修改生产检测逻辑或卡片组件。
- 完整六步录制成功。`securityPending` 位于成片 4.539 秒，记录 loading / confirmation pending，site、parser、requestScan 全部 pending；`securityResultReady` 位于 6.038 秒，记录 critical / risk，site unknown、parser 与 requestScan completed。
- 已查看首帧、5.1 秒与 5.95 秒 Checking 画面、6.2 秒完整风险画面、风险详情、检查项与最后一帧。Checking 期间无 Warning 徽章或提前出现的条目，最终风险复选框未勾选。视频 1920×1200、H.264、yuv420p、30fps、712 帧、23.733333 秒，无音轨。
- 主助手独立运行 7 项模型测试全部通过；`yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T00-49-07-510Z`。随后仅更新当前样片链接及验收说明。

## 手机首页布局与 Rewards 图标（2026-09-10）

[当前成片](output/features/transaction-security-check/takes/2026-09-10T00-39-15-738Z/demo.mp4) · [原片和六步节点](output/features/transaction-security-check/takes/2026-09-10T00-39-15-738Z/take.json) · [冻结的合成参数](output/features/transaction-security-check/takes/2026-09-10T00-39-15-738Z/demo.json)

- 移除演示首页误用的大屏 `DefaultTitle`。393×852 手机首页的搜索框和 Bookmarks 标题使用 20px 左右留白，保留产品四列书签网格、56px 图标及居中名称；未修改产品组件。
- 新增原创 Rewards 图标，深绿底与浅色四角图形；SVG 源文件和 512×512 PNG 位于 `apps/mobile/prime-demo/assets/`。书签、真实 WebView 的 dApp 页头、Permit2 的站点标识共用这张 PNG，替换地球占位图和字母 R。dApp 就绪条件等待品牌图和代币图加载结束。
- 实际重跑完整六步录制。书签触点自动从设备坐标 `(64.17, 281)` 更新为 `(64.17, 229)`，没有改点击坐标或镜头配置。首帧已加载图标，已查看首页转场、领取页、风险卡片、风险详情、检查项和最后一帧。末尾回到风险卡片，风险确认保持未勾选。
- 成片 1920×1200、H.264、yuv420p、30fps、732 帧、24.4 秒，无音轨。新素材和快照保存在独立 take 目录，旧版本保留。
- 3 项本地 dApp 测试通过，包含实际 PNG 端点响应检查。`yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T00-39-16-660Z`；随后仅更新样片链接和本验收说明。

## 权益页整理版（2026-09-10）

[当前成片](output/features/transaction-security-check/renders/2026-09-10T00-24-27-077Z/demo.mp4) · [原片和六步节点](output/features/transaction-security-check/takes/2026-09-10T00-20-46-262Z/take.json) · [冻结的合成参数](output/features/transaction-security-check/renders/2026-09-10T00-24-27-077Z/demo.json)

- 首帧为 Browser 首页的 Rewards 书签。页面使用 Rewards、125 USDC、Claim，已移除画面上的 Demo 与 localhost。虚构展示域名为 `rewards.example.com`，实际请求仍走本地 fixture；Site security 为 Unverified，未伪装成已认证站点。
- 首页下方常驻同一个真实 WebView。收到文档、资产和正尺寸布局反馈后才报告 `browserReady`。本次 `dappPrepared` 比开片早 3ms，点击书签到 `dappVisible` 为 359ms，其中首页淡出为 200ms；已查看转场后的完整领取页。原生隐藏路由预加载实测超时，已移除，没有保留固定 viewport 注入。
- 六次真实点击依次完成打开 dApp、领取、打开与关闭风险详情、打开与关闭检查项。未勾选风险复选框，未点击 Confirm。最后镜头回到风险卡片并停留，遮罩已完全消失。
- 已检查第一帧、dApp、检查中、Risk、三条风险详情、三个检查项和最后一帧。新片 1920×1200、H.264、yuv420p、30fps、712 帧、23.733333 秒，无音轨。后续只将书签点击指引缩短至 0.35 秒，防止提示残留到领取页；原片和镜头不变。
- 单独跑完“打开 → 领取 → 点击 Permit2 右上角关闭 → 再次领取 → 再次关闭”。两次均出现真实风险卡片，关闭后目标控件消失；已查看最后返回 Rewards 的成片和模拟器截图。配置、原片和日志位于本机 `.tmp/prime-demo/polish/close-smoke*`。
- 96 项合成及录制配置测试、7 项原生模型测试、3 项本地 dApp 测试通过。`yarn agent:check --profile commit` 全部通过，日志为 `node_modules/.cache/agent-checks/2026-09-10T00-20-45-969Z`；之后仅调整点击时长与说明文档。
- 本轮 Metro、fixture 服务已退出，4737 和 8081 无监听，专用模拟器已关闭。原 checkout 的改动保留，没有提交或推送。

## 可变帧率尾帧修正（2026-09-10）

合成器 1.7.1 使用 `fps=30:eof_action=pass` 保留位于两帧之间的最后一次画面更新。实际原片最后一帧为 29.993333 秒、风险卡片已恢复正常亮度；默认 `fps=30` 只输出到 29.966667 秒，导致追加停留复制了遮罩淡出中的上一帧。

用 [整理版原片](output/features/transaction-security-check/takes/2026-09-09T23-48-18-778Z/take.json) 重新生成 [修正尾帧的成片](output/features/transaction-security-check/renders/2026-09-10T00-09-03-214Z/demo.mp4)，已查看最终画面。新旧视频均为 835 帧，前 774 帧解码摘要完全相同，仅最后一帧及其 60 帧停留改变。原有点击与镜头时间保持一致。96 项合成及录制配置测试通过，包括普通 30fps 素材画面一致性和稀疏 VFR 裁剪测试。

## 首轮 Transaction security check（已由整理版替代）

2026-09-10（北京时间），在独立 worktree `.worktrees/prime-transaction-security-video`、分支 `yikzero/prime-transaction-security-video` 上验证。基于 `upstream/x` 的 `32e7ca870a81319348a830c00df3caa0f62c873a`，包含已合并的 PR #13190。原 checkout 的已有改动保留，没有提交或推送。

[首轮样片：125 USDC](output/features/transaction-security-check/takes/2026-09-09T16-42-51-344Z/demo.mp4) · [原片及节点](output/features/transaction-security-check/takes/2026-09-09T16-42-51-344Z/take.json) · [逐帧合成参数](output/features/transaction-security-check/takes/2026-09-09T16-42-51-344Z/demo.json)

- 重建最新 x 的原生 iOS 模拟器包后，实际运行 `record transaction-security-check`。本地 WebView 加载 Rewards Demo，发出 `eth_signTypedData_v4`，真实产品卡片显示 Checking → Risk，打开风险详情及检查项，再勾选风险复选框。七次操作全部成功，未点击 Confirm。
- 风险源为固定的高风险 spender／wallet-drainer 示例；无限授权只说明资产权限范围。复用产品请求构建、结果归一化、卡片、详情和覆盖项组件；外层浏览器入口与确认场景是演示壳，未连接真实账户或线上检测。Site security、Signature analysis、Transaction security check 的 Checked 表示检查完成，不表示各项结果安全。
- 先录制 100 USDC，再只改 fixture 的领取文案为 125 USDC 重录；新原片、快照及成片均显示 125。已查看最终成片的第一帧、dApp、Checking、Risk、三条详情、三个检查项和最终选中状态。新场景没有扫光，也不等待扫光节点。
- 成片 1920×1200、H.264、yuv420p、30fps、790 帧、26.333333 秒，无音轨。保留 393×852 设备、已确认渐变、机身、边框和点击样式。镜头由本次点击节点定位，设备框固定；镜头裁切仍移动整张录屏，并非 App 内部滚动。
- 第一帧等待浏览器原生转场结束及按钮正尺寸布局；WebView 数据加载后才显示领取内容。点击位置取真实控件布局，WebView 按钮取页面报告的局部坐标。点击节点是主机发出操作的时间，不宣称与原生显示帧完全同步。
- 同一原片执行 [停留 4 秒、隐藏提示](output/features/transaction-security-check/renders/2026-09-09T16-48-53-271Z/demo.mp4)，得到 850 帧／28.333333 秒，恰好增加 60 帧；原片摘要与镜头关键帧不变。直接 [重放冻结的录制目录](output/features/transaction-security-check/renders/2026-09-09T16-48-54-987Z/demo.mp4)，790 帧解码摘要全部一致。结果保存在 [复用验收数据](output/features/transaction-security-check/validation-reuse-final.json)。
- 最新原生包上的 [SignGuard 兼容样片](output/features/signguard-permit2/takes/2026-09-09T16-48-56-135Z/demo.mp4) 也完整重录成功，258 帧／8.6 秒。实际收到两套动画结束节点及风险复选框反馈；查看了扫光与最终选中画面。它使用最新 x 的卡片与独立资产预览，外观不承诺与旧 x 的布局一致。
- 录制进程自动关闭本轮 Metro／fixture 服务；独立核对 8081、4737 无监听，专用模拟器已关闭。

### 可变帧率时间轴修正

模拟器原片会省略静止期间的帧。直接 `ffmpeg -ss … -i raw.mp4` 快跳抽帧可能跳到后续关闭弹层的画面，不能据此判断弹层未录到。已用实际模拟器截图和合成后的恒定帧率视频确认弹层正常，没有保留多余的 Portal 宿主改动。

合成器 1.6.0 修复了另一处实际问题：旧的“先裁剪、再将首个剩余包归零”会在裁剪点落入静止间隙时，使画面早于事件节点。现在先按原始时间轴补齐 30fps，再按帧裁剪并保留末帧。已用稀疏红／蓝测试视频验证切入间隙时仍保留正确静帧，也核对了真实样片的 Checking 阶段；普通 30fps 测试素材的解码画面保持一致。

合成、镜头、点击与布局测试 45 项，feature／录制流程测试 51 项，原生数据模型 Jest 测试 5 项，合计 101 项通过，无跳过项。

`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T16-52-33-717Z`。之后只更新复用说明和 CLI 的场景限制提示。

## 历史记录位置

以下 SignGuard 记录来自原 checkout `/Users/yikzero/Code/app-monorepo/development/prime-demo/`；其历史 `output/` 留在原位置，没有复制到当前 worktree。下面的相对产物链接需从原 checkout 打开，不代表本轮重新生成。

## 按事件定位镜头与按场景等待就绪

2026-09-09，合成器 1.5.0 新增 `camera.moves`：从本次原片的实际反馈节点倒推镜头起止时间。录制器新增 `readyMarker / requiredMarkers / waitAfterReadyMs`，不再一律要求两种扫光结束。旧 `keyframes` 和 `waitAfterAnimationsMs` 继续兼容；现有 SignGuard 默认仍等待完整动画。

[本轮重录样片](output/features/signguard-permit2/takes/2026-09-09T14-55-30-258Z/demo.mp4) · [2 秒镜头版本](output/features/signguard-permit2/renders/2026-09-09T14-54-18-125Z/demo.mp4) · [机器验收数据](output/validation-event-camera.json)

- 使用旧原片实际执行 `render`，默认 1.4 秒镜头和仅改为 2 秒的版本，各 275 帧均与研究阶段对应样片逐帧一致；点击反馈时间保持 7.014 秒。隐藏提示后镜头关键帧不变。省略 take 或传入摘要不匹配的 take，会在编码前报错，未生成视频。
- 旧绝对时间快照 `replay` 的 275 帧与旧成片一致。临时将当前 feature 写成无效 JSON，新事件镜头快照仍能重放，275 帧与首次输出一致；随后恢复当前配置。
- 从服务与模拟器关闭状态运行 `record signguard-permit2` 成功。新原片反馈节点位于成片 6.733 秒，比旧原片早 0.281 秒；镜头自动移至 4.033～5.433 秒，仍在反馈前 1.3 秒到位，运动持续 1.4 秒。真实触点仍为 `(30, 742)`，输出 1920×1200 / 30fps / H.264 / yuv420p、264 帧、8.8 秒，无音轨。已查看新成片的点击帧。
- 另用同一原生场景、`readyMarker: sceneReady`、仅要求 `sheetVisible`、就绪后等待 5700ms，完成第二次录制。`sceneReady` 比动画完成早 3683ms，实际点击从它起算 5906ms 后执行，包含控件查询和调度耗时；没有额外等待动画完成再计时。该次输出 254 帧、8.466667 秒。这里验证的是录制就绪条件，场景本身仍保留原有动画。
- `sceneReady` 来自真实复选框的正尺寸布局，两次原生录制均只报告一次。镜头距离、设备构图、假数据、触点换算及动画启动方式均沿用此前方案；未增加独立扫光启动控制。
- 最终 1.5.1 修正小数运算导致第 0 秒起步或两段镜头衔接被误报的问题，仅在边界允许 1e-9 秒舍入误差。独立核对上述 6 个录制或合成版本，关键帧和实际事件时间与修正前完全一致。
- 74 项针对性测试全部通过，无跳过项；`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T15-03-51-328Z`。完成后 8081、4737 端口已释放，专用模拟器已关闭。

## 按 feature 复用与历史重放

2026-09-09，新增独立 feature 配置、公共构图 preset，以及 `list / check / record / render / replay` 入口。录制与合成均先保存配置快照，再读取快照执行；当前参考样片的画面和时序保持不变。

[新入口重录样片](output/features/signguard-permit2/takes/2026-09-09T14-23-19-927Z/demo.mp4) · [停留 4 秒且隐藏提示](output/features/signguard-permit2/renders/2026-09-09T14-23-32-196Z/demo.mp4) · [机器验收数据](output/validation-reuse.json)

- 默认公共 preset 及 feature 入口复用此前干净原片，275 帧均与已确认的 v3 样片逐帧一致。
- `render --hold 4 --no-taps` 成功，无需启动 App。输出为 335 帧、11.166667 秒；原片摘要保持不变。
- 临时将当前 feature 和公共 preset 写成无效配置，历史 `replay` 仍成功，275 帧与原成片一致；随后恢复配置。错误的原片摘要会在合成前被拒绝。
- 从服务与模拟器关闭状态运行 `record signguard-permit2` 成功：实际使用快照 fixture/camera/taps/layout/capture 配置，完成扫光和风险复选框点击。自动触点 `(30, 742)`，成片节点为 7.014 秒，输出 1920×1200 / 30fps / H.264 / yuv420p、275 帧，无音轨。已检查点击帧。
- 新录制目录保留原片、节点、固定数据及快照，`latest` 正确选择此 feature 的新原片。录制完成后补全快照中的原片摘要和裁剪参数；直接重放该目录成功，275 帧与录制时自动生成的成片一致。
- 52 项针对性测试通过，覆盖布局范围、曲线、点击像素、配置预检、快照隔离和录制参数。`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T14-24-34-296Z`。
- 完成后 8081、4737 端口已释放，专用模拟器已关闭。开头约 0.6 秒先出现标题的已知时序保留，未在本轮调整。

## 点击提示适度增强

2026-09-09，合成器 1.4.2 将白圆不透明度从 40% 调到 46%，涟漪从 18% 调到 28%；保留柔边、缓动、浅灰绿色及 0.85 秒时长。[调整后的样片](output/signguard-permit2-hd-taps-v3.mp4) 复用关闭工具触点圈后的同一原片，位置、事件时间和镜头参数均与 v2 一致。已检查点击帧，29 项针对性测试通过；本次仅调整视觉常量，未重复运行全仓检查。

## 点击效果柔化与采集触点圈修复

2026-09-09，合成器 1.4.1 将按下幅度从 16% 降为 8%，增加 70ms 平滑淡入和径向柔边，涟漪减速扩散，末尾 240ms 淡出。默认时长为 0.85 秒，白圆不透明度 40%，涟漪为 `#A8B3AE` / 18%。同一旧原片抽样比较，后期涟漪对浅色背景的暗化约降为原来的四分之一。

抽帧还发现旧原片自带 Detox 大灰圈。此前只验证了后期提示开关，遗漏了录制工具这层指示。根据 [Detox 20.46.3 的触点显示实现](https://github.com/wix/Detox/blob/20.46.3/detox/ios/Detox/DetoxAppDelegateProxy.m#L135)，录制启动参数增加 `detoxDisableTouchIndicators: 1`，随后完整重录成功。

[柔和点击样片](output/signguard-permit2-hd-taps-v2.mp4) · [无提示对照](output/signguard-permit2-hd-taps-hidden-v2.mp4) · [检查数据](output/validation-taps-soft.json)

- 新原片位于 `output/takes/2026-09-09T13-48-36-733Z`。真实复选框仍正常选中，自动触点 `(30, 742)`，反馈节点位于成片 7.005 秒；未点击 Confirm。
- 点击后 0～0.3 秒抽取 10 个时点，比较无提示版与稳定帧。大灰圈所在区域的灰色像素旧版峰值为 1388，新版各时点均为 0；已查看新成片和无提示对照的点击帧。
- 两版均为 1920×1200、H.264、yuv420p、30fps、275 帧、9.166667 秒。今后调整样式可复用本次干净原片。
- 独立运行 29 项测试全部通过，包含 FFmpeg 淡入、柔边及淡出像素检查。`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T13-48-20-292Z`。

## 可配置点击提示

2026-09-09，合成器 1.4.0 支持全局及单次事件开关、自动或手动位置、反馈节点或时间定位、时差、持续时间、圆形大小及颜色透明度。指示先叠在完整原片上，再随镜头裁切和圆角遮罩处理。

[点击提示样片](output/signguard-permit2-hd-taps.mp4) · [隐藏提示对照](output/signguard-permit2-hd-taps-hidden.mp4) · [点击帧](output/signguard-permit2-hd-taps-click.png) · [机器检查](output/validation-taps.json)

- 完整运行 `run.mjs --hold 2 --camera development/prime-demo/fixtures/camera-signguard.json --taps development/prime-demo/fixtures/taps-signguard.json --interaction risk-checkbox` 成功。新原片和节点位于 `output/takes/2026-09-09T13-31-42-647Z`。
- Detox 真实点击风险复选框，收到页面选中回调，未点击 Confirm。控件屏幕位置为 `(20, 722)`，控件内触点为 `(10, 20)`，最终使用设备坐标 `(30, 742)`。保留原始 React 根视图触点 `(30, 683)` 供排查，避免误把它当整机坐标。
- 节点解析到成片第 7.071 秒；无提示对照中首次选中画面为第 7.133 秒，相差约 62ms。抽样圈心为输出坐标 `(614, 989)`，与预测位置各轴相差不足 1px。已查看点击帧及最终选中画面。
- 显示和隐藏版本复用同一原片，均为 1920×1200、H.264、yuv420p、30fps、282 帧、9.4 秒。隐藏提示后，原片中的实际点击仍然保留。
- 另外用已有原片验证手动坐标、镜头移动期间的跟随，以及屏幕边缘的裁切。全局关闭提示时，243 帧与添加提示功能前的同参数视频逐帧一致。
- 独立运行 29 项针对性测试全部通过，覆盖曲线实际像素、提示出现和消失、负时间裁切、原片与节点匹配、坐标转换；`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T13-31-56-053Z`。

当前只有风险复选框录制步骤，其他真实操作需要补充相应控件和反馈节点。更改提示样式、时机或镜头只需重新合成；更改真实操作需重新采集。

## 镜头速度与加减速曲线

2026-09-09，合成器 1.3.0 支持在起始关键帧设置 `linear`、`ease-in`、`ease-out`、`ease-in-out`。省略时继续使用原来的缓入缓出。

复用去除标题栏底线后的原片，实际合成四种曲线并核对中点位移：第 5 秒的输出位移分别为 360、180、540、360px，画面与预期裁切位置匹配。旧配置及显式 `ease-in-out` 的 243 帧均与之前样片逐帧一致。另有 6 项针对性测试通过，覆盖独立位置表、混合曲线、范围限制、非法配置和 FFmpeg 实际像素输出。

曲线对照：[匀速](output/easing-comparison/linear.mp4) · [逐渐加速](output/easing-comparison/ease-in.mp4) · [逐渐减速](output/easing-comparison/ease-out.mp4) · [缓入缓出](output/easing-comparison/ease-in-out.mp4) · [验证数据](output/easing-comparison/validation.json)。调整曲线或持续时间只需重新合成。

`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T13-01-46-292Z`。

## 标题栏分隔线修复

2026-09-09，确认横线来自 iOS 原生导航栏的默认底线，原片中已经存在。演示页补齐正式 App 使用的 `headerShadowVisible: false` 后，重新运行完整录制与合成；新原片位于 `output/takes/2026-09-09T12-50-36-019Z`。

[修正后的移动镜头样片](output/signguard-permit2-hd-camera-v2.mp4) · [固定镜头对照](output/signguard-permit2-hd-static-v2.mp4) · [像素检查](output/validation-header-line.json)

已查看重录后的原片标题区域。相同位置的横线从灰色恢复为与上下相同的背景色，确认修复发生在原生页面。`yarn agent:check --profile commit` 全部通过，日志位于 `node_modules/.cache/agent-checks/2026-09-09T12-49-44-302Z`。

## 1920×1200 高清与固定框内镜头

2026-09-09，按 640×400 设计坐标的 3 倍直接合成高清成片。机身圆角从 36 调整为 43（输出 129），机身宽 288、顶部 48、内边框 8、外描边 4 / 黑色 20% 的比例保持一致。

[移动镜头样片](output/signguard-permit2-hd-camera.mp4) · [固定镜头对照](output/signguard-permit2-hd-static.mp4) · [参数](output/signguard-permit2-hd-camera.json) · [机器检查](output/validation-hd-camera.json)

- 复用 `output/takes/2026-09-09T12-18-47-249Z/raw.mp4`，仅重新合成，验证调镜头无需重录。两版均为 1920×1200、H.264、yuv420p、30fps、245 帧、8.166667 秒、无音轨。
- 4.3 秒前保持原位，4.3～5.7 秒平滑下移 240 设计像素；前 130 帧与固定版逐帧解码摘要一致。
- 已检查开头扫光、中段平移及最终画面。下方风险确认和按钮进入画面，手机框、圆角遮罩和背景固定；抽样像素也保持一致。渐变编码后与目标色的通道误差不超过 2。
- 验证插值端点、中点、严格数字类型、非递增时间和负距离的拒绝行为。当前构图的最大下移范围为 246 设计像素。
- 从服务关闭状态执行 `node development/prime-demo/run.mjs --hold 4 --camera development/prime-demo/fixtures/camera-signguard.json` 成功，包含真实 Detox 点击、新原片采集及高清镜头合成；产物位于 `output/takes/2026-09-09T12-45-55-881Z`。
- `yarn agent:check --profile commit` 全部通过，日志目录为 `node_modules/.cache/agent-checks/2026-09-09T12-47-23-208Z`。完成后已确认 8081、4737 端口释放，专用模拟器关闭。

这里的镜头是后期裁切整段录屏，状态栏和标题也随画面移动，未添加 App 内部滚动或自动跟踪点击。

以下为此前版本的验收记录。

## 640×400 构图更新

2026-09-09，按新规格使用 iPhone 15 Pro 重新录制。逻辑尺寸 393×852，截图 1179×2556；simctl 的 H.264 原片取偶数宽度，实际为 1178×2556。原片位于 `output/takes/2026-09-09T12-18-47-249Z`。

[新视频](output/signguard-permit2-640x400.mp4) · [新封面](output/signguard-permit2-640x400.png) · [构图参数](output/signguard-permit2-640x400.json)

成片为 640×400、30fps、H.264、yuv420p。机身宽 288、顶部 y48、水平居中；内侧 8px 黑框，外侧 4px、20% 不透明黑描边，外框宽 296、顶部 y44。渐变从上方 `#39DB00` 到下方 `#00C9A5`。已查看最终画面，并取像素核对渐变方向、描边明暗及边框位置；设备下半部分自然超出画布。

已用新默认设备再次运行完整录制与合成命令，产物位于 `output/takes/2026-09-09T12-23-54-183Z`。像素及尺寸检查结果保存在 [validation-640x400.json](output/validation-640x400.json)。代码检查日志位于 `node_modules/.cache/agent-checks/2026-09-09T12-23-51-464Z`。

以下保留首次 1920×1200 版本的测试记录。

## 首次全流程验收

2026-09-09，本机 iPhone 17 Pro 模拟器、iOS 26.5。使用真实 Detox 点击、simctl 录屏及 FFmpeg 合成。

[查看 8.1 秒样片](output/signguard-permit2.mp4) · [封面](output/signguard-permit2.png) · [机器验收数据](output/validation.json)

## 已验证

- 从服务关闭状态运行 `node development/prime-demo/run.mjs`，自动启动、录制、合成、退出成功。本次单条约 57 秒。
- 逐帧查看原片和成片：原生 sheet、卡片边缘扫光及淡出、SignGuard 扫光、代币图标正常。动画完成由实际回调报告。
- `--repeat 3` 连续成功；每次重新启动 App、挂载场景，各有独立原片与相同 fixture 摘要。
- 修改金额后重新录制：画面从 `-0.01 / +0.009993` 变成 `-0.02 / +0.019986`。已核对封面及数据摘要，验收后恢复默认 fixture。
- 同一原片仅改 `--hold 2` 为 `--hold 4`：视频从 6.1 秒变成 8.1 秒，增加 60 帧，原有 183 帧解码画面全部一致。
- 五条有效采集均输出 1920×1200、H.264、yuv420p、30fps、无音轨的视频。
- `yarn agent:check --profile commit` 全部通过。日志目录：`node_modules/.cache/agent-checks/2026-09-09T11-25-07-970Z`。
- 录制结束后，脚本关闭自己启动的 Metro 与 fixture 服务；已确认 8081、4737 端口释放。

## 连续三次结果

| take 目录（位于 output/takes） | 成片时长 | sheet 可见至两段动画完成 |
| ------------------------------ | -------- | ------------------------ |
| 2026-09-09T11-34-46-152Z       | 6.167 秒 | 4019 毫秒                |
| 2026-09-09T11-35-16-684Z       | 6.133 秒 | 4004 毫秒                |
| 2026-09-09T11-35-37-536Z       | 6.100 秒 | 3953 毫秒                |

这一组动画结束时点的差异为 66 毫秒。模拟器原片是可变帧率，裁剪结束时间按实际最后一帧限制，稳定画面停留由合成参数控制。

初始样片及 4 秒停留版本位于 `output/takes/2026-09-09T11-33-08-946Z`；改金额的版本位于 `output/takes/2026-09-09T11-37-01-210Z`。

## 使用范围

这是复用生产组件的独立演示场景，尚未接入完整签名控制器。当前只验证展示和视频生成，未覆盖键盘输入、完整账户链路和实际签名。

安全卡片和动画的组件改动会直接进入下次录制。确认页字段结构、导航或交互变化，需同步调整演示场景。首轮录制聚焦安全检查卡片，未加入向下滚动展示完整授权信息的步骤。

首次准备处理了本机 node_modules 与原生缓存不一致的问题，并重新构建、签名了模拟器包。后续仅修改 JS/TS UI 或 fixture，可直接运行重录命令；变更原生依赖时才需要重建包。工具、原片、成片和日志均保存在本机。

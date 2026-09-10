---
name: onekey-prime-video
description: 制作和维护 OneKey Prime 权益介绍页的本地演示视频，包括新增场景、UI 更新后重录、镜头与点击提示微调、压缩导出和历史复现。不用于 Prime 数据报表或线上安全检测验收。
---

# OneKey Prime 权益视频

使用 app-monorepo 中 `development/prime-demo/` 的真实 iOS 组件录制与 FFmpeg 合成流程。Skill 负责选工作路径和操作；脚本、配置、资源及详细说明以所选 checkout 为准，不复制到 skill 内维护。

## 找到工作目录

优先使用用户明确指定的 checkout，并读取其 AGENTS.md。否则检查当前目录及 `git worktree list` 中的候选位置，确认有 `development/prime-demo/demo.mjs`、`features/transaction-security-check/feature.json`，并读取 `--help` 和 README。普通重录不隐式切换代码版本或覆盖脏文件；用户要求最新分支时另行核实版本。

这套个人工具的源码保存在 `yikZero/app-monorepo` 的 `yikzero/prime-transaction-security-video` 分支。新机器先按仓库 `PORTABILITY.md` 恢复源码、依赖和素材，再执行演示。不要假设用户名、仓库绝对路径、模拟器 UDID 或 `.app` 与上一台机器一致。后文命令均在选定仓库根目录执行。

Skill 的维护源位于该仓库 `development/prime-demo/skill/onekey-prime-video/`；全局安装目录是它的安装副本。修改 Skill 时更新仓库源并同步本机副本，演示脚本和配置仍只在仓库维护。

## 按修改内容选操作

| 用户要做什么 | 操作 |
| --- | --- |
| UI、文字、金额、图标、真实操作或等待变化 | 修改场景 / fixture / capture 后 `record` |
| 镜头快慢、曲线、移动距离、点击气泡或结束停留变化 | 修改 camera / taps / compose 后，从已有 take `render` |
| 已认可画面，只要压缩上传 | 从认可的合成 MP4 `export`，不重新录制或合成 |
| 复现历史画面 | 对历史 take / render 目录 `replay`，使用冻结配置 |
| 新权益 | 选择接近的场景；页面不同则先增加原生适配器，复制 JSON 本身不能驱动新页面 |

日常只使用一个命令入口：

```sh
node development/prime-demo/demo.mjs list
node development/prime-demo/demo.mjs check transaction-security-check
node development/prime-demo/demo.mjs doctor post
node development/prime-demo/demo.mjs record transaction-security-check
node development/prime-demo/demo.mjs render transaction-security-check --take latest
node development/prime-demo/demo.mjs render transaction-security-check --take TAKE_DIRECTORY --hold 4 --no-taps
node development/prime-demo/demo.mjs replay HISTORICAL_RENDER_DIRECTORY --take MATCHING_TAKE_DIRECTORY
node development/prime-demo/demo.mjs export APPROVED_MASTER.mp4 --crf 23
```

`latest` 指该 feature 最近成功的原片，不是最近认可的成片。用户指定“最终版”时，从 README、已给出的文件或输出记录定位明确的 MP4 / take，不能盲用 latest。`export` 输出新的交付目录，包含视频、首帧封面和来源 / 参数记录；可用 `--output NEW_DIRECTORY` 指定位置。

## 按需读仓库说明

以下路径相对于已选定仓库，不是 skill 目录。只读当前操作需要的部分。

- `development/prime-demo/FEATURE_GUIDE.md`：新增 feature、配置字段、事件镜头、真实点击及适配器接入。
- `development/prime-demo/TRANSACTION_SECURITY.md`：Browser → Rewards → Permit2 → 风险详情与检查范围的已完成场景、固定响应和节奏。
- `development/prime-demo/UPLOAD.md`：当前兼容编码、压缩参数、封面和交付记录。
- `development/prime-demo/LOW_LEVEL.md`：模拟器包、服务、低层采集合成命令；仅搭环境或排查时读。
- `development/prime-demo/PORTABILITY.md`：换机保存范围、系统要求、已核实版本和恢复步骤；迁移或从零搭建时先读。当前录制要求 Mac，其他系统的后期尚未验收。
- `development/prime-demo/VALIDATION.md`：验收证据与历史限制；需要定位已认可素材或回归问题时读。
- `development/prime-demo/BLOCKAID_EXAMPLES.md`：设计新的风险故事时参考。若要核实供应商最新行为，另查官方资料，不能将本地 fixture 当成线上检测证据。

## 保留已确认的设计与边界

当前共用 preset 为 `presets/prime-393x852.json`，默认从 393×852 逻辑设备生成 1920×1200 / 30fps 视频。机身位置、边框、圆角等数值读取该文件，不另写一份配置。镜头只移动框内录屏，机框固定；这与 App 实际滚动不同。

渐变保留 `#39DB00 → #00C9A5`。用户已经明确：压缩与格式对齐不需要改背景。不要从旧片抽颜色去替换背景、增加调色逻辑或改共用 preset。其他构图、点击样式也沿用配置，除非当前任务要改。

最新 Transaction security check 使用本地 Rewards dApp、固定 Prime 响应和真实产品组件。先完整 Checking，再一起出现结果；风险细节和检查项可打开查看；最后回到卡片，不勾选“自行承担风险”，不确认签名或广播。Site security 的未验证状态保留在检查项中。新的营销场景优先使用可重录的固定数据，不冒充一次真实线上检测。

镜头优先绑定实际操作节点，提示位置优先读取控件布局；调整 `duration` 会改变出发时间，保持 `arriveBefore` / `arriveAfter` 对应的到位时间。要改真实操作时点，改 capture 并重录。金额等画面内容也必须重录，仅合成不能更新。

没有扫光的新场景不引入扫光触发或等待。旧 SignGuard 场景的单次动画兼容逻辑保留；仅处理它时再读其动画与 Reduce Motion 条件，不推广为所有场景的前提。

## 验收与复用

根据此次改动核对结果：录制看首帧内容是否完整、真实页面及节点是否就绪、最终状态是否正确；镜头或提示微调看对应时间段；压缩看格式、帧数 / 时长、文字和渐变，并保留高质量合成版。

模拟器 raw 可能是稀疏可变帧率视频。抽帧优先读最终恒定帧率 MP4；直接对 raw 用 `-ss` 快跳可能读到后面的画面，不能据此判定漏录。必要时按仓库说明先规范化时间轴。

保留 raw、take.json、配置快照和认可的合成 MP4。历史 replay 使用当前工具读取旧快照；跨工具版本不保证字节一致，需结合源码摘要和实际画面判断。旧 snapshot 可能保存旧电脑的绝对原片路径，迁移时用 `replay --take` 显式指定同一份原片所在的 take；必须通过原始摘要校验，不能改摘要绕过检查。不要为“整理”删除底层兼容入口、旧素材或已确认输出。普通 render / export 不启动 App；完整 record 需本机 Xcode、模拟器包及依赖，具体路径先查 README / LOW_LEVEL。

交付本地 MP4、封面、复现位置与关键检查结果。上传 CDN、改线上素材引用或推送代码，仅在用户请求这些动作时执行。

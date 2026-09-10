# 上传到现有 Prime 权益页

保留已验收的最终画面，仅压缩视频并对齐现有编码和色彩标记。背景色、UI、构图、镜头和节奏不作调整；高质量合成版与原始录屏保留，上传版单独输出。

2026-09-10 核对 `primeFeatureIntroUtils.ts` 引用的 8 个 CDN 视频，共同参数如下：

| 参数 | 当前线上视频 |
| --- | --- |
| 容器 / 编码标识 | MP4 / avc1 |
| 编码 | H.264 High，Level 5.0 |
| 分辨率 / 帧率 | 1920×1200 / 30fps |
| 像素格式 / 范围 | 8-bit yuv420p / limited（tv） |
| 色彩标记 | BT.709 matrix、primaries、transfer |
| 音频 | 无 |

现有文件约 0.45～1.43 MB，时长 6.23～22.6 秒，视频码率约 426～888 kbps。体积取决于时长和画面变化，不按旧文件大小硬凑固定码率。

## 日常导出

使用同一个入口，将明确认可的合成 MP4 导出为上传包：

```sh
node development/prime-demo/demo.mjs export \
  development/prime-demo/output/features/transaction-security-check/renders/2026-09-10T01-23-04-569Z/demo.mp4 \
  --crf 23
```

默认输出到该 MP4 同目录的 `deliveries/<时间>/`。需要指定位置时加 `--output NEW_DIRECTORY`，目录必须尚不存在。每次包含：

- `video.mp4`：压缩后的上传视频。
- `poster.png`：上传视频的第一帧封面。
- `export.json`：输入和输出的摘要、大小、实际格式、编码参数、执行命令及编码脚本快照。

输入须为本流程的 1920×1200、30fps、yuv420p、BT.709 matrix / limited range 合成 MP4。命令会先核对输入，再核对输出的帧数、时长和格式。它不启动 App，也不重新读取 feature 或更改背景、镜头和点击时间。传入的是原始录屏或其他规格时会提示格式不匹配，不自动缩放或裁剪。

## 压缩参数与底层兼容

编码实现仍只有 `export-upload.sh` 一份，由新入口调用。H.264 slow / CRF 23 保留当前清晰度与体积选择；`setparams` 只补齐帧上的 BT.709 色彩标记，不进行像素调色，参见 [FFmpeg 文档](https://ffmpeg.org/ffmpeg-filters.html#setparams)。CRF 越低，通常体积越大、压缩损失越少。压缩有轻微量化误差，检查正文、细线和渐变后再决定是否进一步压缩。

旧命令保留，只输出 MP4，不包含新入口的封面与交付记录：

```sh
sh development/prime-demo/export-upload.sh APPROVED_MASTER.mp4 NEW_UPLOAD.mp4 23
```

两种入口都拒绝覆盖已有输出。已经认可的上传文件位于 README 指向的固定交付目录，本次整理没有重新覆盖它。

高质量合成版、原片及快照仍位于对应的 renders / takes 目录。之后整批重录、升级编码时，从这些素材重新导出，避免在已压缩的上传文件上反复转码。视频与核对记录位于 Git 忽略的 `output/`，脚本及本说明随源码保留。

# DICOM 样本验收记录

- 验收日期：2026-11-04
- 系统版本：ChestX-AI v3.9.2 + DICOM 验收修复
- 浏览器：Chrome headless 1360×900 视口
- 操作系统：Windows
- 测试入口：`/interpret`

## 1. 样本

| 编号 | 文件 | 大小 | Transfer Syntax | 说明 |
|---|---|---:|---|---|
| A | `cxr_uncompressed_8bit.dcm` | 1,049,558 B | `1.2.840.10008.1.2.1` | 未压缩 8 位，Explicit VR Little Endian |
| B | `cxr_uncompressed_16bit.dcm` | 2,098,134 B | `1.2.840.10008.1.2.1` | 未压缩 16 位，Explicit VR Little Endian |
| C | `cxr_compressed_jpeg.dcm` | 179,662 B | `1.2.840.10008.1.2.4.50` | JPEG Baseline 压缩 |
| D | `broken_truncated.dcm` | 100 B | — | 截断文件 |

样本来源：`training/make_dicom_samples.py` 从项目自带胸片演示图生成。  
患者姓名、ID、Study UID 均为演示值，没有真实患者数据。

## 2. 结果

| 编号 | 预期 | 实际 | 结论 |
|---|---|---|---|
| A | 正常显示、完整分析 | 显示“胸片上传成功”；点击“开始分析”后完成推理，生成报告：浸润影 48.6%、No Finding 17.9%、Nodule 17.6%，风险分级与免责声明正常 | 通过 |
| B | 正常显示、可分析 | 显示“胸片上传成功”，查看器显示 16 位图像，开始分析按钮可用 | 通过 |
| C | 友好拦截、不崩溃、不进入推理 | 顶部提示“检测到压缩 DICOM（Transfer Syntax 1.2.840.10008.1.2.4.50）。本演示仅支持未压缩 8/16 位 DICOM，请在 PACS/导出工具中另存为未压缩 DICOM，或转换为 JPG/PNG 后上传。”页面保持可用 | 通过 |
| D | 友好报错、不白屏 | 提示“DICOM 文件过短或已损坏”，页面保持可用 | 通过 |

## 3. 截图

- [未压缩 DICOM 正常显示](dicom_acceptance_uncompressed.png)
- [压缩 DICOM 友好拦截](dicom_acceptance_compressed.png)
- [未压缩 DICOM 完整分析](dicom_acceptance_analysis.png)

## 4. 修复记录

验收时发现：压缩 DICOM 被拦截后，查看器已回到“待上传”，但右侧仍可能保留上一张影像的“影像已就绪”状态。

已修复 `frontend/src/composables/useImageUpload.js`：读取失败时清空 `currentCase / series / diagnoseStatus / agentResult`，避免旧状态与新上传状态不一致。

## 5. 结论

- 未压缩 8 位 DICOM：可正常读取和推理。
- 未压缩 16 位 DICOM：可正常读取和推理。
- 压缩 JPEG DICOM：**不支持解码**，但在解码前友好拦截，提示转换路径，不崩溃、不白屏、不进入推理。
- 损坏/截断文件：友好报错，不白屏。

因此对外表述应写：

> 支持未压缩 8/16 位 DICOM；压缩 DICOM 不进入推理，系统会提示用户转换为未压缩 DICOM 或 JPG/PNG。

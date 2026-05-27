# 全自动套图生成

本地桌面版商品图生成工具。当前流程：

1. 上传商品参考图。
2. 固定使用 Grsai 的 Gemini 提示词模型（默认 `gemini-3.1-pro`）识别商品、生成提示词。
3. 使用 Grsai `/v1/images/generations` 生成图片。
4. 左侧可按 Grsai 官方分辨率选择 `gpt-image-2`、`gpt-image-2-vip` 和 `nano-banana` 系列模型；生成图片会在本机临时保留 3 天，超过 3 天后自动清理。

## 运行

```powershell
npm.cmd install
npm.cmd start
```

## 打包

生成 Windows 安装包和便携版：

```powershell
npm.cmd run dist
```

打包产物会输出到 `dist` 目录。

PowerShell 如果阻止 `npm`，使用 `npm.cmd`。
启动脚本会自动忽略 `ELECTRON_RUN_AS_NODE=1`，避免 Electron 被误当作 Node 进程运行。

## API 设置

启动软件后点右上角“设置”，填写：

- 识图/提示词 API 地址：`https://grsai.dakka.com.cn/v1`
- 识图/提示词 API Key：你的 Grsai Key
- 识图/提示词模型：默认 `gemini-3.1-pro`
- 接口类型：`Chat Completions`
- Grsai API 地址：国内节点 `https://grsai.dakka.com.cn` 或全球节点 `https://grsaiapi.com`
- Grsai API Key：你的 Grsai Key
- 1K 生图模型：`gpt-image-2`
- 2K / 4K 生图模型：`gpt-image-2-vip`

API Key 保存在本机 Electron 用户数据目录，不写入项目代码。

# Antigravity Task Sound 🔔

> 在 Antigravity AI Agent 完成回复时自动播放声音通知

当你在 [Antigravity IDE](https://antigravity.google) 中使用 AI Agent 时，扩展会通过 **Chrome DevTools Protocol (CDP)** 实时检测 AI 是否正在生成回复。一旦 AI 完成回复，自动播放提示音通知你。

## ✨ 功能

- 🎯 **精准检测** — 通过 CDP 协议检测 AI 停止按钮状态，非 hack 方式
- 🔔 **自动通知** — AI 回复完成后 ~4 秒内播放提示音
- 🎵 **自定义音效** — 支持自定义 `.wav` 音效文件和音量调节
- 📊 **状态栏显示** — 右下角实时显示 CDP 连接状态
- 🔄 **自动重连** — 断开后自动尝试重新连接
- 🖥️ **跨平台** — Windows / macOS / Linux

## 📦 安装

### 1. 配置 Antigravity 启动参数

在 Antigravity 快捷方式的目标末尾添加：

```
--remote-debugging-port=9000
```

### 2. 安装扩展

下载最新的 `.vsix` 文件，然后在 Antigravity 中：

1. `Ctrl+Shift+P` → `Install from VSIX`
2. 选择下载的 `.vsix` 文件
3. `Ctrl+Shift+P` → `Reload Window`

### 3. 开始使用

扩展启动后会自动连接 CDP。状态栏右下角显示 `CDP 已连接` 即表示工作正常。

## 🛠️ 命令

| 命令 | 说明 |
|------|------|
| `Antigravity Task Sound: Test Sound` | 播放测试声音 |
| `Antigravity Task Sound: Toggle` | 开关通知 |
| `Antigravity Task Sound: Connect CDP` | 手动连接 CDP |

## ⚙️ 设置

| 设置 | 默认值 | 说明 |
|------|--------|------|
| `enabled` | `true` | 启用/禁用通知 |
| `cdpEnabled` | `true` | 启用 CDP 检测 |
| `cdpPort` | `9000` | 远程调试端口 |
| `soundFile` | `""` | 自定义 .wav 音效路径 |
| `volume` | `50` | 音量 (0-100) |

## 🔧 工作原理

```
Antigravity (Electron)          扩展
       │                          │
       │  --remote-debugging-port │
       │◄─────────────────────────┤  CDP WebSocket 连接
       │                          │
       │   每 2 秒轮询 DOM        │
       │   检测"停止按钮"         │
       │                          │
       │   按钮存在 = AI 生成中    │
       │   按钮消失 x3 = 完成!    │
       │                          │
       │                     🔔 播放声音
```

核心检测逻辑借鉴自 [Remoat](https://github.com/optimistengineer/remoat) 项目的 `responseMonitor.ts`。

## 📝 从源码构建

```bash
git clone https://github.com/1582182391/antigravity-task-sound.git
cd antigravity-task-sound
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
```

## License

MIT

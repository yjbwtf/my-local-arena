# Local Arena 个人构建（Personal Build）

本仓库是我个人自用的 **Local Arena** 构建与发布点，**不是官方项目**，也不代表上游作者的立场。

- 面板（Panel）：官方 Local-Arena **1.4.3.3** 原版可执行文件，未改动
- 插件负载（Plugin payload）：**1.4.6.1** = Local-Arena 1.4.3.3 的 plus 组件 + CS2-Bot-Improver **1.4.6** 的增强人机 + 重新编译修复的换肤插件

## 这个版本修了什么

CS2 在 **2026/9/23** 更新后，Local-Arena 的换肤插件 `PlayerKnifeCustomizer` 里硬编码的内存特征码失效（旧：`40 53 55 41 56 48 81 EC 90 00 00 00`，新 `server.dll` 里 0 处匹配），导致皮肤"换上了但贴图渲染错误"（AK-47/M4A1消音版/USP消音版 印花集、AWP 可燃冰 等），日志里满屏 `Invalid function pointer`。

本仓库发布的负载把该特征码替换为上游当前在用的 `48 89 4C 24 ? 53 41 55 41 56`（在当前 `server.dll` 中唯一匹配 1 处）并用 .NET 10 重新编译，同时重新生成了 `plus-payload-manifest.json`，使面板的"验证安装"不再报缺失文件。

详细的根因分析、验证结果与操作说明见 `docs/个人版说明.md`。

## 安装 / 更新

**方式一：面板内置在线更新（需要本仓库为公开库）**

面板的更新客户端不带任何鉴权，**私人库的 Release 附件对它是 404**，所以只有把本仓库设为公开（或用你自己的公开仓库）时，"设置 → 在线更新"才能拉到 `latest.json`。

**方式二：手动**

1. 下载 Release 里的 `LocalArena-plugin-v1.4.6.1-windows.zip`，解压覆盖到面板目录（保留隐藏的 `.csbip`）。
2. 用面板的"安装 / 修复安装"把它写入 `…\Counter-Strike Global Offensive\game\csgo`（必须先完全关闭 CS2）。
3. 完整包 `LocalArena-v1.4.6.1-windows.zip` 可直接解压当便携面板用。

> 面板本身显示的版本（左下角 / 标题栏）是**面板二进制**的构建版本 1.4.3.3，与插件负载版本 1.4.6.1 是两回事；"概览 → 安装"与"设置 → 安装与恢复"里显示的才是负载版本。

## 包含组件与许可

本项目按 **AGPL-3.0** 分发（见 `LICENSE`），组件来源：

| 组件 | 来源 | 版本 |
| --- | --- | --- |
| 增强人机（BotAI / BotAimImprover / BotBuy / BotRandomizer / BotState / NadeSystem / RoundDamageRecap / BotController / BotHider / BotVision） | [ed0ard/CS2-Bot-Improver](https://github.com/ed0ard/CS2-Bot-Improver) | 1.4.6 |
| plus 组件（PlayerKnifeCustomizer / PlusMatchCoordinator / OfflineMatchTelemetry / BotHiderImpl 等） | [numakkiyu/Local-Arena](https://github.com/numakkiyu/Local-Arena) | 1.4.3.3 |
| CounterStrikeSharp | [roflmuffin/CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp) | 1.0.376 |
| Metamod:Source | [alliedmodders/metamod-source](https://github.com/alliedmodders/metamod-source) | 随负载 |
| Ray-Trace | [FUNPLAY-pro-CS2/Ray-Trace](https://github.com/FUNPLAY-pro-CS2/Ray-Trace) | 1.0.16 |
| CS2-Bot-Hider | [XBribo/CS2-Bot-Hider](https://github.com/XBribo/CS2-Bot-Hider) | 随负载 |

问题请提到上游项目，或在本仓库记录；本仓库不提供任何保证。

## 隐私

发布包里的**玩家饰品预设**（`player_gun_presets.json` / `player_knife_presets.json`）与**机器人对局配置**（`cfg/my_bot_ffa_config.cfg` / `cfg/my_bot_normal_config.cfg`）已替换为官方默认值，不含个人配置。这些文件在面板清单里是 `preserve-config`，安装时不会覆盖你本地已有的设置。

## 工具

`tools/` 里是构建与校验脚本（Node.js + 少量 PowerShell）：

- `build-release.js` / `build-146.js`：合并 Local-Arena plus 组件与上游负载、重算 `plus-payload-manifest.json`
- `build-publish.js`：生成"去个人配置"的发布包
- `make-feed.js`：生成并 Ed25519 签名 `latest.json`（`keys/local-update-signing-key.pem` 只在本地，**不入库**）
- `repatch-panel.js`：把面板内置更新地址指向自己的 https 源（地址是定长字符串，`https://github.com/<owner>/<repo>/releases/latest/download/latest.json` 必须正好 77 字节）
- `verify-146.js` / `verify-build.js`：核对负载、安装登记与特征码

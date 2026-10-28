# Local Arena 个人构建（Personal Build）

> **这不是原创项目，也不是官方发布。**
> 本仓库只是把两个优秀的开源项目合并成一个个人自用构建，并按各自的许可证重新分发：
>
> - **[numakkiyu/Local-Arena](https://github.com/numakkiyu/Local-Arena)**（前身 CS2BotImproverPlus）—— 面板与全部 "plus" 组件，作者 **numakkiyu**
> - **[ed0ard/CS2-Bot-Improver](https://github.com/ed0ard/CS2-Bot-Improver)** —— 增强人机（瞄具、移动、投掷物、性格、经济、职业队档案等），作者 **ed0ard**
>
> 以及它们各自依赖的 [XBribo/CS2-Bot-Hider](https://github.com/XBribo/CS2-Bot-Hider)、[XBribo/CS2-Bot-Controller](https://github.com/XBribo/CS2-Bot-Controller)、[XBribo/CS2-Bot-Vision](https://github.com/XBribo/CS2-Bot-Vision)、[YuGeYu/LBTV-CS2-Bot-Enhancer](https://github.com/YuGeYu/LBTV-CS2-Bot-Enhancer)（RoundDamageRecap）、[roflmuffin/CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp)、[alliedmodders/metamod-source](https://github.com/alliedmodders/metamod-source)、[FUNPLAY-pro-CS2/Ray-Trace](https://github.com/FUNPLAY-pro-CS2/Ray-Trace)。
>
> **所有功能、绝大部分代码与全部设计归功于上述作者**，本仓库只做了一处一行级别的修复（见下文）与打包。完整的组件清单、许可证与源码索引见 **[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)**。

## 版本构成

| 部分 | 内容 |
| --- | --- |
| 面板 Panel | 官方 Local-Arena **1.4.3.3** 可执行文件，**原版未改动**（源码：Local-Arena `v1.4.3.3`） |
| 插件负载 Plugin payload | **1.4.7.2** = Local-Arena 1.4.3.3 的 plus 组件 + CS2-Bot-Improver **1.4.7** 增强人机 + CounterStrikeSharp **1.0.378** + 下面这两处修复 |

## 本构建唯一的代码改动

CS2 在 **2026-09-23** 更新后，换肤插件 `PlayerKnifeCustomizer` 中硬编码的 AOB 特征码失效（旧 `40 53 55 41 56 48 81 EC 90 00 00 00` 在新的 `server.dll` 中匹配 **0 处**），导致皮肤"换上了但贴图渲染错误"（AK-47 / M4A1消音版 / USP消音版 印花集、AWP 可燃冰 等），日志中满是 `Invalid function pointer`。

修复方式：把该特征码替换为上游当前在用的 `48 89 4C 24 ? 53 41 55 41 56`（在当前 `server.dll` 中唯一匹配 1 处），并用 .NET 10 重新编译；同时重新生成 `plus-payload-manifest.json`，使面板"验证安装"不再报缺失文件。

- 修改后的完整源文件：[`tools/PlayerKnifeCustomizer.cs.fixed`](tools/PlayerKnifeCustomizer.cs.fixed)（基于 Local-Arena `v1.4.3.3` 同名文件，可整体替换后重建）
- 除此之外的所有负载文件与上游发布包逐字节一致（`feed/SHA256SUMS.txt` 可复核）

## 许可证与源码

- 本仓库分发的二进制整体按 **AGPL-3.0** 提供，全文见 [LICENSE](LICENSE)。
- 各组件分别是 AGPL-3.0 / GPL-3.0 / zLib-libpng / MIT；GPL-3.0 与 AGPL-3.0 的组合由 GPLv3 第 13 条允许。
- CounterStrikeSharp 为 GPL-3.0，并附特别例外：引用其发布 .NET 包的派生作品（插件）允许改用 MIT。
- 逐组件的许可证与**源码链接**见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。若你需要 Corresponding Source，请按该文件中的链接取上游源码，并用 `tools/` 下的脚本复现本构建。
- `overrides/*/botprofile.vpk` 等游戏数据源自 Counter-Strike 2（© Valve Corporation），不受上述开源许可证覆盖。

## 安装 / 更新

**方式一：面板内置在线更新**

面板的更新客户端不带鉴权，因此本仓库（或你自己的发布仓库）需要是**公开库**，"设置 → 在线更新"才能拉到 `latest.json`；私人库的 Release 附件对它是 404。

> **走代理的注意**：面板的 HTTP 客户端（reqwest）只读 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量，**不读 Windows 的"系统代理"设置**。如果你的网络必须经代理才能访问 GitHub，请用 `tools/start-panel-with-proxy.cmd` 启动面板（它会自动读取系统代理并注入环境变量），否则更新检查会报 `Cannot contact GitHub update service`。

**方式二：手动**

1. 下载 Release 里的 `LocalArena-plugin-v1.4.7.2-windows.zip`，解压覆盖到面板目录（保留隐藏的 `.csbip`）。
2. 用面板的"安装 / 修复安装"把它写入 `…\Counter-Strike Global Offensive\game\csgo`（必须先完全关闭 CS2）。
3. 完整包 `LocalArena-v1.4.7.2-windows.zip` 可直接解压当便携面板用。

> 面板左下角 / 标题栏显示的版本是**面板二进制**的构建版本 1.4.3.3，与插件负载版本 1.4.7.2 是两回事；"概览 → 安装"与"设置 → 安装与恢复"里显示的才是负载版本。

## 隐私

发布包内的**玩家饰品预设**（`player_gun_presets.json` / `player_knife_presets.json`）与**机器人对局配置**（`cfg/my_bot_ffa_config.cfg` / `cfg/my_bot_normal_config.cfg`）已替换为官方默认值，不含任何个人配置；这些文件在面板清单中为 `preserve-config`，安装时不会覆盖你本地已有的设置。

## 工具

`tools/` 下是本次构建与校验用的脚本（Node.js + 少量 PowerShell）：

- `build-release.js` / `build-146.js`：合并 Local-Arena plus 组件与上游负载，并重算 `plus-payload-manifest.json`
- `build-publish.js`：生成"去个人配置"的发布包
- `make-feed.js`：生成并 Ed25519 签名 `latest.json`（签名私钥只在本地，**不入库**）
- `repatch-panel.js`：把面板内置更新地址指向自己的 https 源（该地址是定长字符串，`https://github.com/<owner>/<repo>/releases/latest/download/latest.json` 必须正好 77 字节）
- `verify-146.js` / `verify-build.js`：核对负载、安装登记与特征码

## 免责

个人自用构建，与上述任何项目及其作者**均无隶属或合作关系**，不代表上游立场，也不由上游提供支持。使用后果自负；反馈问题请先到上游项目，本仓库的改动请不要拿去打扰原作者。

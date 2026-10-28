# 第三方组件、许可证与源码索引

本仓库**不是原创项目**。它只是把两个开源项目的东西合并成一个自用构建，并按各自的许可证重新分发。所有智识成果属于下列原作者。

> 本仓库分发的全部二进制按 **AGPL-3.0**（见 [LICENSE](LICENSE)）提供。GPL-3.0 与 AGPL-3.0 的组合由 GPLv3 第 13 条明确允许；每个组件的原始许可证与源码获取方式见下表。

## 一、主要来源项目（本构建的基础）

| 项目 | 作者 | 版本 | 许可证 | 源码 | 本构建使用了什么 |
| --- | --- | --- | --- | --- | --- |
| [Local-Arena](https://github.com/numakkiyu/Local-Arena)（前身 CS2BotImproverPlus） | [numakkiyu](https://github.com/numakkiyu) | **v1.4.3.3** | AGPL-3.0 | <https://github.com/numakkiyu/Local-Arena/tree/v1.4.3.3> | 面板可执行文件（**原版未改动**）、全部 "plus" 组件负载 |
| [CS2-Bot-Improver](https://github.com/ed0ard/CS2-Bot-Improver) | [ed0ard](https://github.com/ed0ard) | **v1.4.6**（发布包 `CS2BotImprover.zip`，sha256 `e66a17329ccb00b340555fb64b09b0771ea4a0aa04566e7b9a915d7ad4c6f28e`） | AGPL-3.0 | <https://github.com/ed0ard/CS2-Bot-Improver/tree/v1.4.6> | 增强人机全部插件与其配置、`overrides/` 机器人档案数据 |

## 二、人机插件（来自 CS2-Bot-Improver 及其子模块）

| 负载目录 | 上游项目 | 作者 | 许可证 | 源码 |
| --- | --- | --- | --- | --- |
| `plugins/BotAI` | [CS2-BotAI](https://github.com/ed0ard/CS2-BotAI) | ed0ard | AGPL-3.0 | 仓库源码 |
| `plugins/BotAimImprover` | [CS2-Bullseye-Bot](https://github.com/ed0ard/CS2-Bullseye-Bot) | ed0ard | AGPL-3.0 | 仓库源码 |
| `plugins/BotBuy` | [CS2-Bot-Buy](https://github.com/ed0ard/CS2-Bot-Buy) | ed0ard | AGPL-3.0 | 仓库源码 |
| `plugins/BotRandomizer` | [CS2-Bot-Randomizer](https://github.com/ed0ard/CS2-Bot-Randomizer) | ed0ard | AGPL-3.0 | 仓库源码 |
| `plugins/BotState` | [CS2-Smarter-Bot](https://github.com/ed0ard/CS2-Smarter-Bot) | ed0ard | AGPL-3.0 | 仓库源码 |
| `plugins/NadeSystem` | [CS2-Bot-NadeSystem](https://github.com/ed0ard/CS2-Bot-NadeSystem) | ed0ard | AGPL-3.0 | 仓库源码 |
| `addons/BotController`, `plugins/BotControllerImpl` | [CS2-Bot-Controller](https://github.com/XBribo/CS2-Bot-Controller) | [XBribo](https://github.com/XBribo) | AGPL-3.0-only（`libraries/` 内组件保留各自上游许可） | 仓库源码 |
| `addons/BotHider`, `plugins/BotHiderImpl`, `shared/BotHiderApi` | [CS2-Bot-Hider](https://github.com/XBribo/CS2-Bot-Hider) | XBribo | AGPL-3.0-only（同上例外） | 仓库源码 |
| `addons/BotVision` | [CS2-Bot-Vision](https://github.com/XBribo/CS2-Bot-Vision) | XBribo | AGPL-3.0-only（同上例外） | 仓库源码 |
| `plugins/RoundDamageRecap` | [LBTV-CS2-Bot-Enhancer](https://github.com/YuGeYu/LBTV-CS2-Bot-Enhancer) | [YuGeYu](https://github.com/YuGeYu) | AGPL-3.0 | 仓库源码 |

## 三、运行时与框架

| 负载目录 | 组件 | 版本 | 许可证 | 源码 / 许可原文 |
| --- | --- | --- | --- | --- |
| `addons/counterstrikesharp/**` | [CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp) | 1.0.378 | **GPL-3.0**，并附特别例外：**引用其发布 .NET 包的派生作品（插件/扩展）允许改用 MIT** | <https://github.com/roflmuffin/CounterStrikeSharp/tree/v1.0.378>（例外全文见其 `LICENSE`） |
| `addons/counterstrikesharp/dotnet/**` | Microsoft .NET 运行时（由 CounterStrikeSharp 官方包捆绑） | 10.0.x | MIT | 许可原文随负载提供：`addons/counterstrikesharp/dotnet/LICENSE.txt` |
| `addons/metamod/**` | [Metamod:Source](https://github.com/alliedmodders/metamod-source) | 2.0.0-git1406 | **zLib/libpng**（宽松许可） | <https://github.com/alliedmodders/metamod-source>（`LICENSE.txt`） |
| `addons/RayTrace/**`, `plugins/RayTraceImpl/**`, `shared/RayTraceApi/**` | [Ray-Trace](https://github.com/FUNPLAY-pro-CS2/Ray-Trace) | v1.0.16 | **GPL-3.0** | <https://github.com/FUNPLAY-pro-CS2/Ray-Trace/tree/v1.0.16> |

## 四、不属于上述开源许可的内容

- `overrides/*/botprofile.vpk` 内的 `botprofile.db` 源自 **Counter-Strike 2** 游戏数据（© Valve Corporation），由上游项目修改后随其发布包一同分发；本仓库沿用上游做法，该数据不受上述开源许可证覆盖。
- `cfg/gamemode_*.cfg` 等同理，为游戏模式配置数据的修改版。

## 五、本仓库唯一的代码改动（AGPL-3.0 §5 要求的修改声明）

| 项目 | 内容 |
| --- | --- |
| 被修改文件 | `addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.cs`（来自 Local-Arena v1.4.3.3） |
| 修改日期 | 2026-10-15 |
| 修改人 | 本仓库维护者（yjbwtf） |
| 修改内容 | 仅替换 `Load()` 中定位 `CAttributeList::SetOrAddAttributeValueByName` 的 AOB 特征码：Windows `40 53 55 41 56 48 81 EC 90 00 00 00` → `48 89 4C 24 ? 53 41 55 41 56`；Linux 分支同步替换；其余代码未改动 |
| 修改原因 | CS2 2026-09-23 更新后旧特征码在当前 `server.dll` 中匹配 0 处，导致皮肤属性写入失败（贴图渲染错误） |
| 修改后完整源码 | 本仓库 [`tools/PlayerKnifeCustomizer.cs.fixed`](tools/PlayerKnifeCustomizer.cs.fixed)（完整文件，可直接替换上游同名文件重建） |
| 重建方式 | 以 Local-Arena v1.4.3.3 源码为基准，替换上述文件后用 .NET 10 SDK 执行 `dotnet build -c Release`（`CounterStrikeSharp.API` 1.0.378） |

| 第二处修改（2026-10-28） | `addons/counterstrikesharp/plugins/OfflineMatchTelemetry/OfflineMatchTelemetry.cs`（同样来自 Local-Arena v1.4.3.3）：按 SteamID 建字典时容忍机器人共用 id "0"（`PlayingPlayersById()` / 索引器赋值），修复每个 tick 抛 `ArgumentException` 造成的卡顿与无响应。修改后完整源码：`tools/OfflineMatchTelemetry.cs.fixed`。其余文件未改动。 |
未列出的所有文件均与上游发布包**逐字节一致**（可用 `feed/SHA256SUMS.txt` 与各上游发布包的 SHA-256 复核）。

## 六、源码获取

- 上游源码：见上表各仓库链接（建议使用对应的 tag/版本）。
- 本仓库需要提供的部分：修改后的完整源文件在 `tools/`，构建脚本在 `tools/`，负载清单 `plus-payload-manifest.json` 可用于校验发布的每个文件。
- 如需本构建的完整可重建源码树，可依 `tools/build-146.js` 的步骤从上游 v1.4.3.3 / v1.4.6 复现。

## 七、免责声明

本仓库为个人自用构建，与 numakkiyu、ed0ard、XBribo、YuGeYu、FUNPLAY、roflmuffin、alliedmodders 及 Valve Corporation **均无隶属或合作关系**，不代表上游立场，也不由上游提供支持。使用本构建产生的任何后果由使用者自行承担；遇到问题请先向上游项目反馈，不要因为本仓库的改动去打扰原作者。

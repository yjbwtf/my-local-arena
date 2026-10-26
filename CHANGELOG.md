# 更新记录

## 1.4.7.1 - 2026-10-26

合并上游 **CS2-Bot-Improver v1.4.7**（2026-10-25）。

- 上游变化：Windows/Linux 签名与偏移全面更新（适配 CS2 1.41.9.2）、综合 FPS 改进、稳定性增强、面板加入版本检测、若干 bug 修复。
- 合并 23 个文件：`BotAI` / `BotAimImprover` / `BotBuy`(未变) / `BotRandomizer` / `BotState` / `NadeSystem` / `BotControllerImpl`、原生 `BotController` / `BotVision`（含新 `gamedata.json`，修掉 `GetSmokeDensityInLine` 在 1.41.9.2 上失效）、`BotControllerApi`、三个 `gamemode_*.cfg`。
- 保持不变：换肤插件（含 9/23 特征码修复）、Local-Arena plus 组件、`BotHider` v0.5.1（与 plus 组件成对，签名在当前 `server.dll` 全部命中）、CounterStrikeSharp 1.0.378（与 v1.4.7 官方包逐字节一致）、已转换的 `overrides/*/botprofile.vpk`（上游自 1.4.6 未改动）。
- 负载 / 安装登记 / 清单同步为 1.4.7.1，Release 附件 SHA-256 与本地产出一致。
## 1.4.6.2 - 2026-10-24

**CS2 1.41.9.2（10/22-23 更新）启动闪退修复。**

- 现象：`cs2.exe` 启动后 10~30 秒内崩溃；Windows 事件日志（应用程序）显示
  `错误模块名称: counterstrikesharp.dll` / `异常代码: 0xc0000005` / 偏移 `0x7e354`。
- 根因：捆绑的 CounterStrikeSharp **1.0.376** 针对旧版 CS2 编译，其 28 条 Windows 签名中有 1 条在新 `server.dll` 里已找不到（`CCSPlayerPawnBase_PostThink`），native tick 钩子指向无效地址 → 访问越界。
- 修复：CounterStrikeSharp 升到 **1.0.378**（2026-10-23，官方更新说明即 "Update Schema Definitions to 1.41.9.2"），28/28 签名全部命中。只替换 `addons/counterstrikesharp/{api,bin,gamedata,lang}`，其余不动。
- 验证：`cs2.exe -insecure` 启动后稳定运行（旧版会在 10~30 秒内崩溃），插件正常加载；`tools/verify-payload.cjs` 全绿。
- 遗留：上游 CS2-Bot-Improver 仍停在 1.4.6（10/11），未针对 1.41.9.2 发版；`BotVision` 的 `GetSmokeDensityInLine` 签名亦失效（仅影响穿烟可见性）。增强人机模式的机器人插件属"等上游"状态。

## 1.4.6.1 - 2026-10-15

- 换肤修复：`PlayerKnifeCustomizer` 的 AOB 特征码按 CS2 2026-09-23 更新替换（详见 THIRD-PARTY-NOTICES.md 的修改声明）。
- 合并上游 CS2-Bot-Improver 1.4.6（BotState 致盲修复、BotAimImprover 态势感知、cfg、botprofile.vpk 重建）。
- 重新生成 `plus-payload-manifest.json`，面板"验证安装"不再报缺失文件。
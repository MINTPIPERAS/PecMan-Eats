# 🦕 Dinosaur-Eats 实现计划

> 记录「恐龙吃网页」插件的分阶段实现计划，供开发全程参照。
> 采用：**Canvas 全屏渲染 + 恐龙主动移动吞吃 + 原生 JS 零构建（Manifest V3）**
>
> **2026-08-03 修订**：策略从「吃文字」改为「吃网页分块（横条 + 块状咬合 + 多点采样底色）」，砍掉 line-locator 精确定位工程，大幅简化。

---

## 一、需求总览

一个小恶作剧插件：吃豆人 (Pac-Man) 在浏览器全屏 `<canvas>` 上**蛇形双向扫行**，把网页当作一块一块的「食物」，一口一口咬掉变空白（用采样到的网页底色填充）。页面 DOM **完全不移动、不损毁**，插件随时可关闭、可无损还原。内置彩蛋：输入 **418** 吃豆人变异成「茶壶龙 (teapotsaur)」吃货 + 冒烟。

### 核心玩法（吃豆人动，网页不动）
1. 采样当前视口**多个点位**的元素背景色，取**平均值**作为底色。
2. 将视口切成**细密网格**（CELL_W×STRIP_H）。
3. 吃豆人从左上角出发，沿横条**蛇形双向**（偶数行左→右、奇数行右→左）一口一口吃。每咬到一格 → 画布上用底色涂满该格，表现为「被吃消失」。
4. 整条吃完 → 下一行反向；一屏吃完 → 停留空白 + 弹提示「吃光啦! 按任意键还原」。
5. 全程画布覆盖层、`pointer-events:none`、不改 DOM；按键还原即删 canvas 无损恢复。

### 已确认的选型（含 08-03 拍板）

| 议题 | 决定 |
|------|------|
| 渲染方式 | 全屏透明 `<canvas>` 覆盖层（`image-rendering:pixelated`） |
| 吃网页方式 | **蛇形双向吃豆人 + 相对整除网格**（targetW×H → cols×rows，cellW=vw/cols, cellH=vh/rows，完美覆盖） |
| "变空白"的底色 | **多点采样 + 平均色**（elementFromPoint 爬父级取非透明 bg 后加权平均） |
| 吃页范围 | **单屏吃完停留像素弹框（视口尺寸 + 用时）**，按键还原（阶段 4 已取消：`position:fixed` 不透明覆盖层天然等效） |
| 角色 | **吃豆人 Pac-Man SVG**（`assets/pacman.svg`，DOM `<svg>` 元素注入 + SMIL 原生动画 + CSS transform 定位/镜像） |
| 开关 | **纯热键**：`Esc`=停止还原，`Ctrl+Shift+E`=重新开吃，吃光后任意键=还原 |
| 技术栈 | 原生 JS，零构建，Chrome MV3 内容脚本 |

---

## 二、工程目录结构

```
Dinosaur-Eats/
  manifest.json                # MV3: content_scripts + action popup
  src/
    content.js                 # 入口 & 主循环：横条推进/滚动/生命周期
    canvas-layer.js            # 全屏透明 canvas 管理、DPR 适配、图层生命周期
    bg-sampler.js              # ★ 多点采样 + 平均底色（替代原 line-locator）
    dino.js                    # 吃豆人状态机 + SVG 加载/渲染/镜像翻转
    teapot.js                  # 茶壶龙 sprite 与冒烟动画
    easter-egg.js              # 418 键盘数字监听彩蛋
    styles.css                 # 画布层/组件样式 + image-rendering
  assets/
    pacman.svg                 # 吃豆人矢量素材（自带动嘴+摆动 SMIL 动画）
  icons/                       # 扩展图标
    dino-16.png
    dino-48.png
    dino-128.png
  docs/
    plan.md                    # 本文档
```

> 原则：所有像素图与资源优先内联进 JS，保证**零构建、零外部文件**、装即用。

---

## 三、分阶段实现计划

### 阶段 1：工程骨架 & Canvas 层 ✅ 已完成
- [x] `manifest.json`（MV3，`content_scripts` 注入所有 URL）。
- [x] `src/content.js` 入口，注入并打印日志确认生效。
- [x] `src/canvas-layer.js`：全屏透明 canvas、DPR 适配、`pointer-events:none`、自动 resize。
- [x] `src/styles.css`：`image-rendering:pixelated` 等基础样式。
- [x] 占位图标生成。
- [x] **验收通过**：画布层出现但不遮挡正常交互，控制台打印确认日志。

---

### 阶段 2：背景采样引擎（约 0.3 天）
> 目标：准确拿到当前视口的"平均背景色"，作为被吃掉后变空白的填充色。

- [ ] `bg-sampler.js` 实现 `samplePageColor(doc, gridCols, gridRows)`：
  - [ ] 在视口内按网格（如 5×5）取采样点坐标。
  - [ ] 每点用 `document.elementFromPoint(x, y)` 拿到顶点元素。
  - [ ] 沿祖先链上溯，读 `getComputedStyle().backgroundColor`，找到第一个**非透明**（`rgba` 且 alpha>0）的节点。
  - [ ] 解析颜色到 RGB 三元组，若全透明 → 默认白。
  - [ ] 返回所有有效点 RGB 的算术平均 → hex 或 rgba 字符串。
- [ ] `content.js` 测试：初始化后调用 `samplePageColor`，输出平均色信息，并在 canvas 中央画一个该色的矩形验证。
- **验收**：在浅色/深色/彩底网页上分别测试，打出的平均色与视觉一致。

---

### 阶段 3：吃豆人 Pac-Man 渲染 + 蛇形双向吃页 ✅ 已完成
> 演进：恐龙 → offscreen canvas Pac-Man → `assets/pacman.svg` DOM 注入（SMIL 真动画）→ 相对整除完美网格 → 动态 pac 尺寸。
> **2026-08-03 收尾**：`SPEED` 提到 2.5、`pacSize` 从 `cellH*0.65` 提到 `cellH*0.8`；像素风完成弹框（视口尺寸 + 用时 + 离屏 canvas 上采样）；热键 `Esc`=停止还原 / `Ctrl+Shift+E`=重新开吃 / 吃光后普通按键=还原。阶段 4 取消（见下）。

- [x] `assets/pacman.svg`：矢量吃豆人，SMIL 嘴张合 (0.6s) + 摆动 (1.2s)。
- [x] 相对整除网格：`targetW=50, targetH=70` → `cols=round(vw/50), rows=round(vh/70)` → `cellW=vw/cols, cellH=vh/rows`，零残缺全覆盖。
- [x] 动态 pac 尺寸：`pacSize = cellH*0.8`（钳位 18~140px）；`SPEED=2.5`。
- [x] `dino.js`：PacState 状态机 + `DinoLayer`（DOM 容器创建、SVG fetch 注入、定位/镜像、清理）。
- [x] `content.js`：三态状态机（IDLE/EATING/FINISHED）；网格 + 尺寸 + 热键；像素完成弹框（视口尺寸 + 用时 + 离屏 canvas 上采样 → 像素化文字框）。
- **验收**：吃豆人蛇行吃格、被吃区域密实消失、完成弹框显视口尺寸 + 用时、`Esc`/`Ctrl+Shift+E` 控制流正常。

---

### 阶段 4：整页滚动 + 开关控制 → **已取消**
> 原因：`canvas` 为 `position:fixed`，全部视口格被吃完后画布**全不透明覆盖**且钉死在视口；页面滚动时内容被画布挡住 → "怎么滚都是白屏" **天然达成**，无需自动下滚。热键开关已纳入阶段 3 收尾。自动整页滚动暂不必要，留作将来可选特性。
---

### 阶段 5：418 「茶壶龙」彩蛋（约 0.5 天）
- [ ] `easter-egg.js`：全局 `keydown` 缓冲最近 3 个数字，命中 **418**。
- [ ] 增加 `teapotsaur` SVG 素材（或 offscreen canvas 替代）；`teapot.js` 冒烟动画。
- [ ] 触发时：
  - [ ] 切换图层为茶壶龙素材。
  - [ ] 关闭咀嚼动画，壶嘴冒小烟。
  - [ ] 画面一角小字 `I'm a teapot`。
- [ ] 再次 418 可切回吃豆人。
- **验收**：键入 418 吃豆人变茶壶龙并冒烟，再输入切回。

---

### 阶段 6：打磨、边界与交付（约 1 天）
- [ ] 深色/渐变主题：底色不准时的回退与平滑处理。
- [ ] Canvas resize 时已吃填充消失 → 持久化。
- [ ] 无文本页 / 图片为主页 / SPA 兼容与测试。
- [ ] README 使用说明 + 彩蛋说明 + 热键说明。
- [ ] 最终验收清单跑一遍，打包 `.crx` / zip。

---

## 四、MVP 验收标准

1. 任意网页，吃豆人从左上角蛇形逐行吃格，被吃区域变为空白（跟随底色）。
2. 吃完一屏所有格子后停留像素风弹框（显示视口尺寸 + 用时），普通按键还原。
3. `Esc` 随时停止 / `Ctrl+Shift+E` 重新开吃，删 canvas 后页面完全恢复，零残留。
4. 吃豆人 SVG 嘴张合+摆动动画（SMIL）；无外部依赖、零构建、装即用。
5. 输入 418 → 变异茶壶龙冒烟（阶段 5）。

---

## 五、风险与对策速查

| 风险 | 对策 |
|------|------|
| 底色不准（元素各层背景） | elementFromPoint 爬祖先链取第一个非透明 bg；纯透明回退 body/html 计算色 → 最后白 |
| 渐变/图片背景页 | 多点平均近似，阶段 6 可加"逐格重采该行色"回退 |
| 元素背景色含 alpha 混合 | 取白色基底 composite 后得实色 |
| elementFromPoint 被自身 canvas 遮挡 | canvas 已设 `pointer-events:none`，保证穿透到页面元素 |
| Canvas resize 导致已吃填充丢失 | 阶段 6 持久化填充状态 |
| 全屏 canvas 干扰交互 | `pointer-events:none` 保证事件穿透，热键控制 |

---

## 六、时间预估汇总

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 骨架 & 最小原型 | ✅ 完成 |
| 2 | 背景采样引擎 | ✅ 完成 |
| 3 | 吃豆人渲染 + 蛇形吃 + 热键 + 像素弹框 | ✅ 完成 |
| 4 | 整页滚动 + 开关 | 🔴 取消（固定不透覆盖层天然等效） |
| 5 | 418 茶壶龙彩蛋 | ⏭ ~0.5 天 |
| 6 | 打磨/边界/交付 | ⏭ ~1 天 |
| **剩余** | | **约 1.5 天** |

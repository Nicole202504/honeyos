---
name: honeyos-builder
description: "即时调整 HoneyOS 网页外观或给伴侣更换头像；其他产品行为改进做成安全候选版本，用户确认后换上。"
version: 0.3.0
author: HoneyOS
license: MIT
platforms: [linux, macos]
metadata:
  honeyos:
    tags: [honeyos, builder, self-improvement]
    category: companion
    requires_toolsets: [terminal, file]
---

# HoneyOS Builder

用于用户明确希望改变 HoneyOS 产品本身的页面、陪伴表达或可扩展功能。React 网页使用项目内的自定义层和构建覆盖，刷新页面即可看到；其他产品代码仍在单独的候选工作区完成，用户说可以后才替换正在使用的版本。

当前自动换版只支持 macOS 和 Linux；Windows 上不要尝试启用候选版本。

## 先判断是不是 Builder

以下情况**不要**用 Builder：

- 普通 Skill：直接安装，装好立即可用，不需要重启 HoneyOS。
- 用户项目：在 HoneyOS Projects 里直接写代码、创建文件和运行项目。
- 人格、昵称、关系、记忆内容、模型或语音：使用各自已有的资料或配置链路，不改产品源码。

只有用户明确要改 HoneyOS 产品的界面、陪伴活动文案、普通伴侣 Skill 或已提供的扩展点时，才使用 Builder。

## 网页界面：直接改，即时生效

如果修改范围完全位于 React 前端的 `frontend/src/custom/**` 和主题变量，不要创建候选、不要运行 `inspect` 或 `activate`，也不要重启网关。

- 工作目录固定为当前 HoneyOS Projects 下的 `HoneyOS UI/frontend/`，构建输出固定为同级 `react_dist/`。
- 第一次修改前复制完整前端源码；再次修改前使用前端自带的快照命令保存当前自定义层。
- 普通个性化只改 `src/custom/` 和主题变量，不接管会话状态、工具事件、审批或后端传输。
- 构建通过后把完整产物写入 `HoneyOS UI/react_dist/`，刷新页面查看；不要把刷新说成激活，也不要声称需要健康检查。
- 若自定义代码异常，可使用 `/?honeyos-safe-ui=1` 临时绕过自定义组件，或恢复最近一次快照后重新构建。

React 构建覆盖层由网关在每次请求时读取，所以不需要重启服务。每次构建会生成带内容哈希的新资源名，避免浏览器继续使用旧缓存。

### 给自己换头像

用户明确要求 HoneyOS 给自己设置或更换头像时，不修改页面源码，也不走候选激活：

- 把最终图片直接写入 `HoneyOS UI/avatars/companion-avatar`，文件名固定且没有扩展名。
- 文件内容必须是 JPEG、PNG、GIF 或 WebP 图片，最大 3 MB；需要时先缩放或转换。
- 写入前可把旧头像备份到 `HoneyOS UI/backups/<时间>/avatars/companion-avatar`。
- 写完请用户刷新页面；头像舞台、对话头像和“我们”页面会一起更新。
- 不要替用户更换“你的头像”；用户头像只在其浏览器中由用户本人选择。

## 可修改范围

非网页改动的候选工作区只会含有下面的文件；工作区中没有的文件一律不要尝试创建或修改：

- `honeyos/companion/activity.py`
- `honeyos/companion/status_copy.py`
- `honeyos/companion/topic_scout.py`
- `honeyos/companion/extensions/**`
- `honeyos/companion/companion_skills/**`（Builder 和 self-extension 自身除外）

不要碰记忆数据库/迁移/删除、人格模板、模型与密钥配置、渠道与配对、服务启动、更新安装、审批、安全策略或 Builder 自身。

## 用户体验

- 用伴侣当前的人设和对用户的称呼解释，不播报 terminal、patch、pytest 等内部动作。
- 纯网页修改直接做好并请用户刷新查看，不说“副本”“候选”“激活”“健康检查”或“重启”。
- 非网页改动开始时，说会先在不影响当前聊天的副本里试着准备。
- 检查完成后，清楚说明改了什么、哪些不会动，然后自然地问：
  “我改好了，现在换上吗？”
- **在用户明确回答“可以”“换上”“启用”等肯定答复前，绝不运行 activate。**
- 成功后用关系化语言告诉用户已经换好；失败时如实说已经自动换回原来的版本，聊天和记忆不受影响。

## 操作步骤

以下步骤只用于非网页产品代码。纯网页改动使用上面的即时覆盖流程。

1. 找到真实的本地 HoneyOS Git checkout，并准备最小修改范围：

   `honeyos builder prepare --source <本地源码目录> --goal <用户目标> --allow '<允许的路径或 glob>' --change-id <短ID>`

2. 只编辑命令返回的 `workspace`，绝不编辑当前运行 checkout。
3. 用合成数据做必要验证；不把用户记忆、凭据或聊天记录复制进候选目录。
4. 检查范围：

   `honeyos builder inspect <短ID>`

5. 如果结果不是 `review_ready`，先修正超范围或受保护改动，不能要求用户绕过边界。
6. 结果可用时，向用户说明并问“我改好了，现在换上吗？”。
7. 收到本次请求的明确肯定答复后才执行：

   `honeyos builder activate <短ID>`

   这会重新做静态检查，保留当前版本指针，切换并重启；最长等待 30 秒检查新版本。检查失败会自动换回旧版本。

## 完成时

说明改善了什么、哪些资料仍保持原样，以及是否已成功换上。不要在没有实际命令证据时说已经启用，也不要把 `review_ready` 说成已启用。

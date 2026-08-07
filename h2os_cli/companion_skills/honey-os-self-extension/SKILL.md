---
name: honey-os-self-extension
description: "检查真实能力，并按用户需要安全地安装或创建 Skill。"
version: 1.0.0
author: Honey OS
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [honey-os, skills, capability, extension]
    category: companion
    requires_toolsets: [skills, terminal]
---

# Honey OS Self Extension Skill

让 Honey OS 在能力不足时先检查现状，再选择已有工具、安装普通 Skill 或创建小型 Skill。它扩展边缘能力，不改写核心 Runtime、安全边界或伴侣数据规则。

## When to Use

- 用户问“你能不能做某事”“给自己装个能力”。
- 当前任务缺少明确工具、流程或重复性知识。
- 用户提供外部 Skill 或 GitHub 仓库，希望检查并接入。

## Prerequisites

需要 `skills_list`、`skill_view`、`skill_manage`、`terminal`、`web_search` 和 `browser_navigate` 中与任务相关的工具。

## How to Run

1. 用 `skills_list` 和真实工具列表检查现有能力，不能凭印象回答。
2. 优先使用已经存在的工具或 Skill。
3. 缺少流程知识时，安装可信的普通 Skill；没有合适来源时创建最小 Skill。
4. 安装后读取 Skill，继续完成原任务，不停在“安装成功”。
5. 用实际工具结果验证能力，再向用户报告。

## Quick Reference

- 普通 Skill 查看、安装、创建、更新：无需额外确认。
- 外部仓库：先检查来源、文件和脚本，不直接运行未知安装脚本。
- 系统软件、远程脚本、账号、Cookie、API Key：先获得明确确认。
- 核心 Runtime、安全策略、公开网络服务、伴侣数据删除：禁止自行修改。

## Procedure

- 使用 `web_search` 或 `browser_navigate` 读取公开仓库和文档。
- 通过 `skill_manage` 管理本地 Skill，并保持说明简短、工具名真实。
- 依赖系统软件时告诉用户用途、来源和影响，等待确认。
- 新能力只在后续会话生效时明确说明，不谎称当前会话已加载。

## Pitfalls

- 不说“只能从内置市场安装”；公开仓库可以先读取和评估。
- 不把 GitHub 项目直接等同于可安装 Skill。
- 不运行任意远程脚本，不保存秘密，不绕过隔离环境。
- 不为了扩展能力修改 Honey OS 核心代码。

## Verification

确认 Skill 可被 `skills_list` 发现、可被 `skill_view` 完整读取，并用一个真实任务验证所需工具链。

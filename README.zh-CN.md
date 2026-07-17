# 主角生存挑战 · HOLO-ARENA

一个以横屏体验为主，包含自动战斗、机关升级、递增波次和 Boss 战的浏览器生存游戏。

[English](./README.md) | [简体中文](./README.zh-CN.md)

## 玩法简介

玩家在全息竞技场中移动，抵挡不断增强的敌人波次，拾取道具并使用金币升级防御机关。游戏会逐步引入新机关，后期则解锁技能与更强的组合成长。

## 主要功能

- 基于 Phaser Arcade Physics 的俯视角生存战斗
- 包含 Boss 战的波次与难度系统
- 多种防御机关和即时场内升级
- 可减速敌人、提高伤害、降低防御、提供无敌或时间停止的掉落道具
- 面向后期成长的技能选择与升级
- 连杀、顿帧、伤害飘字、音效和视觉反馈系统
- 支持鼠标与多点触控，并适配移动端横屏

## 技术栈

Phaser 3 · JavaScript · Vite · Arcade Physics · Web Audio

## 快速开始

```bash
npm install
npm run dev
```

打开 Vite 在终端输出的本地地址。移动设备请旋转至横屏。

## 构建

```bash
npm run build
npm run preview
```

## 项目结构

```text
src/
├── scenes/      # 启动、开始、游戏、UI、升级与结束流程
├── entities/    # 玩家与敌人
├── devices/     # 可升级防御机关
├── systems/     # 波次、生成、战斗、掉落、技能与音效
└── config/      # 数值平衡与视觉主题配置
```

## 操作方式

游戏支持鼠标和触控输入。当前配置有意关闭了键盘输入。

## 参与贡献

玩法数值应统一保留在平衡配置中；新增机制应放入现有 Scene、Device 或 System 分层。

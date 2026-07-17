# Survival Challenge · HOLO-ARENA

A landscape-first browser survival game with automatic combat, upgradeable devices, escalating waves, and boss encounters.

[English](./README.md) | [简体中文](./README.zh-CN.md)

## Gameplay

Move through a holographic arena, survive increasingly difficult waves, collect drops, and spend coins to upgrade defensive devices. New devices are introduced progressively, while later stages unlock skills and stronger build combinations.

## Features

- Fast top-down survival combat powered by Phaser Arcade Physics
- Wave and difficulty systems with regular boss encounters
- Multiple defensive devices with instant in-arena upgrades
- Drops that can slow enemies, increase damage, reduce defense, grant invincibility, or stop time
- Skill selection and upgrades for late-game progression
- Combo, hit-stop, floating damage, sound, and visual-feedback systems
- Mouse and multi-touch input with a landscape mobile layout

## Tech Stack

Phaser 3 · JavaScript · Vite · Arcade Physics · Web Audio

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. On mobile devices, rotate to landscape orientation.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
├── scenes/      # Boot, start, game, UI, upgrades, and game-over flow
├── entities/    # Player and enemies
├── devices/     # Upgradeable defensive devices
├── systems/     # Waves, spawning, combat, drops, skills, and audio
└── config/      # Balance and visual-theme settings
```

## Controls

The game supports pointer and touch input. Keyboard input is intentionally disabled in the current configuration.

## Contributing

Keep gameplay values in the balance configuration and isolate new mechanics in the existing scene, device, or system layers.

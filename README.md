# CachyOS Update

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs `cachy-update` from the Steam Deck quick-access menu.

## Features

- One-button update from the QAM — no desktop mode required
- Real-time streaming output via a PTY-based terminal
- Send input to the running process (sudo password, confirmations, etc.)
- ANSI codes stripped for clean readable output

## Requirements

- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed on your Steam Deck
- CachyOS with `cachy-update` available at `/usr/bin/cachy-update`

## Installation

1. Download `decky-cachy-update.zip` from the [latest release](https://github.com/bertonha/decky-cachy-update/releases/latest) and transfer it to your Steam Deck
2. In Gaming Mode, open the quick-access menu (···) → **Decky** → **Settings** → enable **Developer Mode**
3. Still in Decky Settings, open the **Developer** section and choose **Install plugin from ZIP file**
4. Select the downloaded `decky-cachy-update.zip`

## Usage

Open the quick-access menu (···) → **CachyOS Update** → **Run cachy-update**

Output streams in real-time. If the process asks for input (e.g. a sudo password or confirmation prompt), type it in the **Input** field and press **Send**.

## Building from source

```bash
pnpm install
pnpm package
```

The zip will be created at `decky-cachy-update.zip`.

## License

BSD-3-Clause

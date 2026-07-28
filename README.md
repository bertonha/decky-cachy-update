# CachyOS Update

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs `cachy-update` from the Steam Deck quick-access menu.

## Features

- One-button update from the QAM — no desktop mode required
- Real-time streaming output, pushed from the backend as it is produced
- Send input to the running process (sudo password, confirmations, etc.)
- The run gets a real controlling terminal, so `sudo` prompts behave normally
- **Kill** stops the whole process tree, not just the shell that started it
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

## Development

Requires Node.js 22+ and pnpm (pinned via `packageManager` — `corepack enable` picks up the right version).

```bash
pnpm install
pnpm watch      # rebuild dist/index.js on change
pnpm check      # typecheck + lint
pnpm package    # build and produce decky-cachy-update.zip
```

Python is linted and formatted with [ruff](https://docs.astral.sh/ruff/):

```bash
uvx ruff check .
uvx ruff format .
```

### Pre-commit hooks

Hooks are defined in `.pre-commit-config.yaml` and run with
[prek](https://github.com/j178/prek), a drop-in `pre-commit` replacement:

```bash
prek install          # once, to enable the hooks on commit
prek run --all-files  # run everything on demand
```

They cover ruff (lint + format), biome (lint + format, using the version from the
lockfile so it matches CI), `tsc --noEmit`, shellcheck, actionlint, whitespace and
JSON/YAML/TOML sanity checks, and a guard that keeps the `version` in
`package.json` and `pyproject.toml` in sync.

### Architecture

| Path | Role |
| --- | --- |
| `main.py` | Backend. Runs `cachy-update` on a pty, streams output to the frontend via `decky.emit`. |
| `src/api/` | Typed wrappers around the backend's callables and events. |
| `src/hooks/useSession.ts` | Mirrors the backend session into React state. |
| `src/components/Terminal.tsx` | The quick-access panel. |
| `scripts/package.sh` | Assembles the release zip. |

The backend owns the command it runs; the frontend cannot choose it. Output is
pushed as `cachy_update/output` events, and `get_state` returns the authoritative
transcript that the frontend reconciles against when a run ends.

### Releasing

Bump `version` in `package.json`, then push a matching tag:

```bash
git tag v0.0.3 && git push --tags
```

The release workflow verifies the tag matches `package.json`, builds the zip, and
attaches it to a GitHub release.

## License

BSD-3-Clause

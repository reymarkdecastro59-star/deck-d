# DECK'D

> Track your play, not you.

DECK'D is an open-source, cross-launcher gaming habit tracker. A lightweight desktop agent watches for game launches and exits, logs session timing, and syncs to a personal dashboard where you can see how your engagement with each game rises and falls over time.

## How it works

1. **Desktop agent** — a small Python tray app watches for game processes by name. It records start time, end time, and duration. Nothing else.
2. **AWS backend** — serverless API (API Gateway + Lambda + DynamoDB) receives and stores your session records.
3. **Web dashboard** — a React app visualises your playtime history and engagement trends per game.

## Stack

| Layer | Tech |
|---|---|
| Desktop agent | Python, psutil, system tray |
| Backend | AWS SAM · API Gateway · Lambda · DynamoDB · Cognito |
| Frontend | React · Vite · Tailwind CSS · shadcn/ui |

## Privacy

DECK'D matches process names against a games list and ignores everything else. It never reads file contents, logs keystrokes, takes screenshots, or touches anything outside that list.

See [docs/deckd-trust-layer.md](docs/deckd-trust-layer.md) for the full privacy statement.

## Project status

> v1.0 in active development — frontend scaffold complete, backend and agent coming next.

## Getting started

### Web dashboard (development)

```bash
cd web
npm install
npm run dev
```

## License

[CC BY-NC 4.0](LICENSE) — free to use and adapt with credit, not for commercial use.

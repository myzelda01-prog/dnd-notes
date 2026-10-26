# Campaign Codex

A note-taking app for Dungeons & Dragons campaigns. Keep track of sessions, NPCs, locations, quests, loot and lore, and link them together as the story grows.

## Features

- **Campaigns**: keep several campaigns apart and switch between them.
- **Note types** with their own fields:
  - Sessions: session number, date played, in-game date
  - NPCs: status (alive, dead, missing), attitude, where they're found
  - Locations: region
  - Quests: status, quest giver, reward
  - Loot: value in gp, who carries it, rarity
  - Lore: free text
- **Links**: write `[[Oswin Harrow]]` in any note to link to it. Each note shows where it's mentioned. Clicking a link to a note that doesn't exist yet creates it.
- **Formatting**: `## headings`, `- lists`, `- [ ] tasks` you can tick off, `**bold**`, `*italic*`.
- **Search and tags**: search across everything, or type `#tag`.
- **Dice roller**: `d20`, `2d6+3`, `4d8-1`.
- **Backups**: save a campaign to a JSON file and restore it on another device.

Notes are stored in your browser (IndexedDB). Nothing is sent to a server, so back up to a file now and then, and before clearing browser data.

## Develop

```sh
npm install
npm run dev      # start at http://localhost:5173
npm test         # unit tests
npm run lint
npm run build    # production build in dist/
```

Built with React, TypeScript, Vite and Dexie.

## Deploy

Pushing to `main` runs CI and publishes the app to GitHub Pages. Turn it on once under **Settings → Pages → Source: GitHub Actions**.

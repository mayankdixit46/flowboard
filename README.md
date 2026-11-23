# Flowboard

A colorful, fully customizable agile Kanban board.

**Live page:** https://mayankdixit46.github.io/flowboard/

The published app keeps one shared board in its database. Closing the window does not clear it, and anyone who can open the app sees the same items. Changes lists who did what. On the GitHub Pages copy, the board stays in that browser only.

## Features
- Groups you can add, rename, recolor, reorder, and delete
- Drag cards with a mouse, or by the grip on a phone
- Work item types: **Epic, Story, Task, Bug**
- **T-shirt size** estimates (XS–XXL) and a story-point checklist you can check off
- Priority levels
- **Epic roll-ups** — linked count, points, and overdue items
- Custom labels, assignees, due dates (today and overdue)
- Search, type and overdue filters, light/dark/system theme
- Summary dashboard for counts, points, groups, types, priority, and people
- Download or restore a JSON backup

## Shortcuts
- `/` search
- `N` new item in the focused group
- `Alt` + arrow keys move the focused card
- `Esc` closes a panel, or clears the current search

## Run locally

The GitHub Pages file is `index.html`. Open it directly and the board stays in that browser.

The shared app is the Next.js server in this folder. It uses an in-memory database until it is published:

```
npm install
npm run dev
```

Then open the local URL the server prints. `npm run build` applies the database migration when a hosted database is configured.

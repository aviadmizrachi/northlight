# Northlight

Endless music in your browser. It grows, breaks down, drops and changes, like a track made by an artist.

- **Northlight** — https://aviadmizrachi.github.io/northlight/ — a built-in engine with real piano, violin and cello samples. No account, no key.
- **Northlight AI** — https://aviadmizrachi.github.io/northlight/ai.html — endless music from Google Lyria RealTime. You use your own Gemini API key.

## Your key

Your key stays in this browser. This page has no server. It sends your key only to Google, straight from your browser. The code is public: read it on GitHub. Use "Forget key" to delete it.

- The key is saved in your browser's `localStorage` (`northlight-ai.key`). Tick "Don't save (this tab only)" to keep it only in memory until you close the tab.
- The page's Content-Security-Policy (top of [`ai.html`](ai.html)) lists the only servers it may contact. The browser blocks every other server.
- There are no analytics and no tracking.

## Run locally

```sh
npm install
npm run serve      # http://localhost:4173
npm run check      # lint, format check and browser tests
```

## Credits

- Piano: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, CC-BY 3.0, via [Tone.js audio](https://tonejs.github.io/audio/salamander/).
- Violin and cello: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) by Nicholaus Brosowsky.
- [Tone.js](https://tonejs.github.io/) (MIT). Fonts: IBM Plex and Syne (SIL Open Font License).

## License

MIT — see [LICENSE](LICENSE).

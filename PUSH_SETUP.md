# Web Push Setup

This repo now has two parts:

- The static PWA client on GitHub Pages.
- A small push server in `push-server/` that stores subscriptions and sends notifications.

## Why this is separate

GitHub Pages is static hosting. Real Web Push requires a server-side sender with a private VAPID key, so the push server must run somewhere else.

## 1. Deploy the app

Deploy this repo to GitHub Pages as usual so the client is served over `https`.

## 2. Start the push server

From `push-server/`:

```bash
npm install
npm run generate-vapid
```

Copy the generated keys into `.env` based on `.env.example`.

Then start the server:

```bash
npm start
```

## 3. Configure the app

On the Manage Decks page:

- Enter the push backend URL, for example `https://your-push-server.example.com`
- Enter the VAPID public key
- Tap `Save push settings`
- Tap `Enable push`
- Tap `Send server push test`

## 4. iPhone requirements

- iPhone must be on iOS 16.4 or later.
- Open the GitHub Pages site in Safari.
- Add it to the Home Screen.
- Launch the installed Home Screen app.
- Grant notification permission when prompted.

## Notes

- The included push server stores subscriptions in `subscriptions.json`. That is enough for a simple deployment on a small server, but not ideal for scaled production.
- If you deploy the push server behind a different origin, CORS must stay enabled for the client.

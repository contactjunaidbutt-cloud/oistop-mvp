# OiStop!

OiStop! is a cheeky mobile-first PWA MVP for departure checklists.

Core demo flow:

1. Create or select a saved location.
2. Attach a checklist of essentials.
3. Trigger a simulated departure reminder.
4. Log whether the user was ready, needed to check, or snoozed.

## Background Reminder Reality

The hosted Vercel version is a demo. It uses localStorage for data and a `Test Reminder` / `Trigger Demo Nudge` button to simulate the moment when a user leaves Home, Work, Gym, Airport, or another saved place.

For a production app that runs silently in the background:

1. The user saves a place with latitude, longitude, and radius.
2. The user grants location and notification permissions.
3. iOS or Android monitors the geofence in the background.
4. When the user exits the radius, the OS wakes the app briefly.
5. OiStop! checks schedule, quiet hours, and active checklist items.
6. The app sends a local notification: `OiStop! Leaving Home? Got your essentials?`
7. Tapping the notification opens the full reminder screen.

Important: a pure browser PWA cannot reliably do silent background geofencing. Browsers can request location and send web push notifications, but dependable exit detection is an OS-level feature.

Recommended production path:

- Keep this web UI.
- Wrap or rebuild it with Capacitor or React Native.
- Use iOS Core Location region monitoring.
- Use Android Geofencing API.
- Use local notifications for the reminder moment.

## PWA Notes

PWA functionality needs HTTPS or localhost. Opening `index.html` as a `file://` URL is fine for quick viewing, but service workers, install behaviour, notifications, and permissions will not behave like a hosted app.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5175
```

## Deploy To Vercel

This is a static app. Push the `oistop-mvp` folder to GitHub, then import it into Vercel.

Suggested Vercel settings:

- Framework preset: `Other`
- Build command: `npm run build`
- Output directory: `.`
- Install command: `npm install`

The included `vercel.json` serves the single-page app and keeps the service worker from sticking to old cached versions during demos.

## Current MVP Scope

Built:

- Mobile-first PWA interface
- Landing, onboarding, checklist, dashboard, reminder modal, history, profiles, travel mode, settings
- LocalStorage persistence
- Simulated geofence departure reminders
- Yellow/black OiStop! theme
- In-app explanation of hosted demo vs production geofencing

Not built yet:

- Real background geofencing
- Native local notifications
- Account sync or cloud database
- Family/shared reminders
- Apple Watch integration
- Premium subscriptions

# Bossclips

A short-form vertical video app MVP built with Expo + React Native, designed for iOS/Android store release.

## Included

- Full-screen vertical swipe feed with autoplay
- Mood/category filtering
- Likes, saves and native sharing
- Persistent local user state
- Boss Wallet with virtual Boss Coins
- +5 Boss Coins for the first view of each demo clip
- Saved clips screen
- Profile/stats screen
- App icon, splash assets, EAS build configuration
- App Store listing draft, privacy policy draft and launch checklist

## Important reward-system rule

Boss Coins are **virtual loyalty points only**. They have no monetary value and are not withdrawable, transferable, crypto, or redeemable for cash. Keep that wording in the app and policy unless you obtain specialist legal/payment advice and redesign the business model.

## Run locally

Requires Node.js 22.13+ for Expo SDK 57.

```bash
npm install
npx expo start
```

Open with Expo Go or run on an iOS/Android simulator.

## Replace before public launch

1. Change `com.yourcompany.bossclips` in `app.json` to your real unique bundle/package identifier.
2. Replace the public demo video URLs in `src/data.ts` with videos you own/license and host on Mux, Cloudflare Stream, S3/CloudFront, etc.
3. Replace local storage with authenticated backend storage for real accounts and anti-cheat. Supabase is a straightforward choice.
4. Host the supplied privacy policy and terms on public HTTPS URLs and link them inside the app and App Store Connect.
5. If users can upload content, add report/block functionality, moderation, account deletion, and abuse handling before enabling uploads.
6. Add your real App Store Connect app ID to `eas.json`.
7. Test on physical iPhones and via TestFlight.

## Build for App Store

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

You need a paid Apple Developer account. EAS uploads the build; App Store metadata/screenshots and the final review submission still happen in App Store Connect.

## Recommended production backend

- Auth: Supabase Auth
- DB: Postgres/Supabase
- Video: Mux or Cloudflare Stream
- Analytics: PostHog or Firebase Analytics
- Crash reporting: Sentry
- Push: Expo Notifications
- Moderation: server-side review queue + report/block tools

## Suggested server tables

- users(id, username, avatar_url, created_at)
- clips(id, creator_id, title, caption, category, video_url, status, created_at)
- watch_events(id, user_id, clip_id, seconds_watched, completed, created_at)
- likes(user_id, clip_id, created_at)
- saves(user_id, clip_id, created_at)
- coin_ledger(id, user_id, amount, reason, source_id, created_at)

Never trust coin totals sent by the phone. Calculate rewards server-side from deduplicated watch events and keep an immutable ledger.

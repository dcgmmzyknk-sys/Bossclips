# Bossclips v2

Bossclips is an Expo/React Native vertical short-video app with a virtual Boss Coins reward system.

## Included

- Full-screen vertical video feed with autoplay
- Categories: Boss Mode, Motivation, Funny, Chill
- Likes, saves, sharing and reporting
- Virtual Boss Coins (+5 once per first approved clip watch)
- Supabase authentication and profiles
- Server-side coin ledger/RPC to prevent client-selected rewards
- Creator video picker + cloud storage upload
- Pending/approved/rejected moderation flow
- Admin-only direct URL publishing tool
- Saved clips and profile stats
- Demo mode when Supabase is not configured
- EAS iOS/Android build configuration
- SQL schema + Row Level Security policies

## Run

```bash
npm install
npx expo start --tunnel --go
```

For the cloud backend follow `SETUP_SUPABASE.md`.

## Boss Coins

Boss Coins are virtual loyalty points only. They have no cash value and are not withdrawable, transferable, or convertible to money.

## Production warning

This project is a strong MVP foundation, not a substitute for your moderation operations, licensed content, legal review, App Store privacy disclosures, account deletion process, security testing, analytics/observability, and production support.

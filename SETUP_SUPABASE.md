# Bossclips v2 — turn on the real backend from your iPhone

The app works in demo mode without Supabase. Do these steps when you want real accounts, cloud clips, moderation and server-controlled Boss Coins.

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open **SQL Editor** in Supabase, create a new query, paste everything from `supabase/schema.sql`, and run it once.
3. In Supabase, open **Project Settings / API** (or the Connect panel) and copy the Project URL and Publishable key.
4. In your GitHub Codespace, create `.env` in the Bossclips root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. Install the new dependencies and restart Expo:

```bash
npm install
npx expo start --tunnel --go --clear
```

6. Create a Bossclips account in the app. If Supabase email confirmation is enabled, confirm the email and sign in.

## Make yourself the admin

After creating your account, in Supabase > Table Editor > `profiles`, change your own `role` from `user` to `admin`.

The **Create** tab will then show the admin URL tool. Paste a direct HTTPS `.mp4` URL and publish it immediately. Normal creator uploads go to `pending` and should be reviewed before approval.

## Approve creator uploads

In Supabase > Table Editor > `clips`, find a pending clip and change `status` to `approved`. It will then appear in the feed.

## Important before App Store release

Replace all demo video URLs with videos you own or are licensed to distribute. Host your privacy policy and terms on public HTTPS pages. Add an in-app account deletion flow before production submission if you allow account creation. Review reports and remove abusive content promptly.

## Security built in

- The app cannot choose how many coins to award. `award_watch()` always awards exactly 5, once per approved clip/user.
- Normal users cannot update `role` or `coin_balance`; only safe profile columns are client-editable.
- Creator uploads start as `pending`.
- Users can report clips.
- Users can permanently delete their own account from Profile.

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   yarn install
   ```

2. Update sentry config in the `app.json` with your config

3. Start the app

   ```bash
    npx expo prebuild --clean
   ```
4. Open `_layout.tsx` file and replace dsn field with a valid sentry dsn.
5. At this point you should be able to see the stutter. But if you update `replaysSessionSampleRate` to `0` the stutter goes away.

Here is what it should look like. Although it might not be noticeable in the video recording. If you run the app, the difference would be more noticeable. Also the more animation stutters way more if it has a more complex logic e.g. [the one I shared the other day](https://github.com/getsentry/sentry-cocoa/issues/4000#issuecomment-2833322907)


https://github.com/user-attachments/assets/39318fd1-bbc6-4082-9977-e28cd5e57398



https://github.com/user-attachments/assets/68956921-70ed-497b-a867-c8c11548f85f



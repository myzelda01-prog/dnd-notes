# Setting up accounts and sync

Campaign Codex can sync notes between devices when you sign in with a Google account. It uses a free Firebase project (Google's app backend). You only need to do this once.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**, name it `dnd-notes`, and turn Google Analytics off.

## 2. Turn on Google sign-in

1. Open **Build → Authentication** and click **Get started**.
2. Under **Sign-in method**, choose **Google**, switch it on, pick your support email and click **Save**.
3. Under **Settings → Authorized domains**, click **Add domain** and enter `myzelda01-prog.github.io`.

## 3. Create the database

1. Open **Build → Firestore Database** and click **Create database**.
2. Pick a location close to you, choose **production mode**, and click **Create**.
3. Open the **Rules** tab, replace everything with the contents of [`firestore.rules`](../firestore.rules), and click **Publish**. This makes sure each person can only read and write their own notes.

## 4. Connect the app

1. Click the gear icon → **Project settings**.
2. Under **Your apps**, click the **</>** (Web) icon, name it `Campaign Codex` and click **Register app**. Skip Firebase Hosting.
3. Copy the values from the `firebaseConfig` block into [`src/firebaseConfig.ts`](../src/firebaseConfig.ts) and push to `main`. These values are not secret.

## How sync works

- Notes are always saved on the device first, so the app works offline and signed out.
- When you sign in, notes from this device are added to your account and notes from your other devices are downloaded.
- If the same note is changed on two devices, the most recent change wins.
- The example campaign stays on its device. Rename it if you want to keep and sync it.
- Signing out keeps the notes on the device.

## Testing locally with the emulator

```sh
npx firebase-tools emulators:start --only auth,firestore --project demo-codex
VITE_FIREBASE_EMULATOR=127.0.0.1 npm run dev
```

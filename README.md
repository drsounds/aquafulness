# Aquafulness

A first-person swimming experience built with Vite, Three.js and WebGL. Float on a procedural ocean, swim at your own pace, and change the conditions as you go.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the displayed URL in a WebGL-capable browser. Use WASD to swim and the arrow keys to look, or drag the on-screen sticks with a mouse or touch. The middle sticks change the wave direction and apply a current while held. Open **Customize your experience** to change weather, wind, wave height, water color, ocean floor and depth. This is a visual approximation of flotation and waves, not a physical training simulation.

For a production build, run `npm run build`; `npm run preview` serves the result locally.

## Codespaces and Docker

The included dev container installs dependencies and forwards port 5173. In a Codespace, start the live server with `npm run dev -- --host 0.0.0.0 --port 5173` and open the forwarded port.

To run the production site in Docker:

```sh
docker build -t aquafulness .
docker run --rm -p 8080:80 aquafulness
```

Open `http://localhost:8080`.

## Android and Google Play

The Capacitor Android project requires Android Studio, an Android SDK and Java 21. After changing the web app, run:

```sh
npm ci
npm run build
npm run cap:sync
npx cap open android
```

Build and run from Android Studio, or use `cd android && ./gradlew assembleDebug` for a debug APK. The application ID is `com.aquafulness.swim`; change it before publishing if you do not own that Play Console application ID. Update the Android version code for each Play release.

The **Build web and Android** GitHub Actions workflow uploads the web build, debug APK, and unsigned release bundle as artifacts. Play publishing is opt-in: create the application in Play Console and grant a service account permission to upload releases, set repository variables `ENABLE_PLAY_STORE_UPLOAD` to `true` and `PLAY_PACKAGE_NAME` to the Android application ID, and configure repository secrets `ANDROID_KEYSTORE_BASE64` (base64-encoded upload keystore), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, and `PLAY_SERVICE_ACCOUNT_JSON`. Run the workflow manually on `main` to sign the bundle and upload it to the internal track. Never commit the keystore or service account credentials.

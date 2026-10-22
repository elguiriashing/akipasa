# AkiPasa for Android

This folder contains the first Play Store Android client for AkiPasa. It is a
native Android package written against platform APIs, with the production
`https://akipasa.com` application as its interface. It does **not** create a
second database, duplicate business rules, or ship credentials. Supabase,
Cloudflare, Stripe, permissions, localization, and every product role remain
owned by the existing web application.

This architecture is deliberate for the first release: the Android and web
products receive the same features and fixes immediately. A future screen-by-
screen Compose rewrite can keep the same backend, but would require a new,
versioned mobile API and separate acceptance coverage before it can match the
current product safely.

## What the native layer provides

- Installable Android app with package ID `com.akipasa`.
- API 36 target and API 26 minimum.
- Persistent first-party WebView cookies for the existing Supabase session.
- Exact-host HTTPS navigation policy; untrusted schemes stay blocked.
- System-browser handoff for Google OAuth, Stripe, booking, phone, email, map,
  and other external destinations; an explicit app return for Android OAuth.
- Verified HTTPS App Link handling for AkiPasa callbacks and shared links.
- Runtime location permission, wired to the existing user-initiated location
  control.
- Android document picker for the existing validated venue-media upload.
- Authenticated downloads through Android's Download Manager.
- Android back navigation, rotation/state restoration, progress, and a native
  retry screen for main-page network failure.
- Cleartext traffic disabled, unsafe file access disabled, mixed content
  blocked, Safe Browsing enabled, and app-data backup disabled.

## Build locally

Requirements:

- JDK 17.
- Android Studio compatible with Android Gradle Plugin 9.3.
- Android SDK Platform 36 and SDK Build Tools 36 installed.

Open this `Android` directory in Android Studio, let Gradle sync, create an API
36 emulator (or attach a device), and run the `app` configuration. From a
terminal in this directory:

```powershell
.\gradlew.bat test lint assembleDebug
```

For the Play artifact:

```powershell
.\gradlew.bat bundleRelease
```

The unsigned/minified bundle is written beneath
`app/build/outputs/bundle/release`. GitHub Actions also produces an unsigned
`akipasa-v2-unsigned-aab` artifact when Android validation passes. Never upload
that unsigned artifact to Play Console. Release signing must use the private upload
key managed outside this repository. Do not commit a keystore, password,
`local.properties`, or generated bundle.

## Google OAuth and verified App Links

Password sign-in operates entirely in the app. Google OAuth opens in the
system browser because Google does not support embedded-user-agent login.
After Google consent, the browser's callback displays **Return to AkiPasa**.
Tap it to hand the one-time code to the app's WebView, which owns the PKCE
verifier cookie. A verified App Link may instead return automatically. Do not
complete the code exchange in Chrome: its cookies are separate.

Automatic HTTPS link handling requires verified App Links:

1. The existing Play Console app fixes `com.akipasa` as the package name;
   Play package names cannot later be changed.
2. Play App Signing is enabled. Its app-signing SHA-256 fingerprint (not the
   local upload certificate) is recorded in `assetlinks.json.template`.
3. The matching web file is staged at
   `public/.well-known/assetlinks.json`. Deploy it only with explicit web
   deployment approval and serve it as `application/json` without redirects.
4. After deployment, verify the live file and Android association.
5. Verify on a device with:

   ```powershell
   adb shell pm verify-app-links --re-verify com.akipasa
   adb shell pm get-app-links com.akipasa
   ```

Until the production file is deployed and verified, Android may ask which app
should open an AkiPasa HTTPS link. The explicit `akipasa://auth/callback`
return works for local debug builds, but must be exercised on a device. Stripe
returns still depend on verified HTTPS App Links.

For a local Android Studio build, install the current web callback changes on
the live site before trying Google sign-in; older deployed code cannot display
the new return button. After Google consent, tap Return to AkiPasa, then verify
you are signed in inside the app. The Play upload remains gated on a signed
internal-track test of the complete flow.

## Play Console release checklist

- Use the existing Play Console listing for package `com.akipasa`; create it without
  uploading production data or credentials.
- Generate an upload key outside the repository and enable Play App Signing.
- Complete verified App Links as described above.
- Run `test`, `lint`, and `bundleRelease`, then test the signed bundle through
  an internal testing track on at least API 26, 30, 33, and 36 devices.
- Manually accept password login/logout, Google login return, magic-link and
  password-recovery return, discovery/map/location, favourite/follow,
  check-in, QR, venue media upload, account export, Stripe checkout/portal,
  external booking, language switching, offline/retry, rotation, and back.
- Complete the Data safety form from the real production data flows. The app
  can process account/profile data, optional location, user-selected images,
  purchases, and app interactions through the existing AkiPasa providers; do
  not claim that no data is collected merely because the Android package has
  no separate database.
- Link the existing privacy policy and ensure its Android disclosures remain
  accurate. Legal text is still awaiting professional review per repository
  status.
- Supply phone/tablet screenshots, icon, feature graphic, short/full listing,
  content rating, ads declaration, target audience, and app-access review
  instructions for authenticated surfaces.
- Use Internal testing first. Production publication, paid resources, and
  production changes remain approval-gated.

## Configuration decisions

- Start URL: `https://akipasa.com/es` (`BuildConfig.APP_URL`).
- Application ID: `com.akipasa`.
- Version: code `2`, name `1.0.1`.
- Minimum Android: 8.0/API 26.
- Target Android: 16/API 36, matching the Play requirement that begins on
  31 August 2026.

Changing the start URL for a non-production build should use a build variant,
not cleartext traffic or a committed secret. Changing the package ID after a
Play upload creates a different Play app.

## Upload-key reset handoff (19 October 2026)

- The replacement upload key becomes valid on **21 October 2026 at 17:05
  Europe/Madrid**. Do not upload a bundle signed with it before activation.
- Keep the keystore and password outside GitHub, CI logs, and build artifacts.
- Verify the upload certificate SHA-256 in Play Console before signing version
  code 2. The upload certificate is not the Google-managed app-signing
  certificate used by Digital Asset Links.
- Validate the signed bundle on Internal testing before Closed or Production.
- The key reset does not resolve the existing policy rejection or complete the
  organisation-account conversion.

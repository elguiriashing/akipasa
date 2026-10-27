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
- Immersive AkiPasa screen (versionCode 4 / 1.0.3): swipe from the top or
  bottom edge to reveal the system bars temporarily; Android's normal Back/Home
  gestures and buttons remain available. The camera cutout stays clear of
  controls. Test the keyboard and both navigation modes on a real device.
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

## Signing and Internal testing handoff

1. Confirm Android CI passed `test`, `lint` and `bundleRelease` for the exact
   commit in the delivered project. Keep its run URL, commit SHA and artifact
   checksum with the handoff. Extract/open the project in a separate directory;
   preserve the existing Android Studio project. The CI artifact named
   `akipasa-v2-unsigned-aab` is unsigned validation output, despite its historical
   name. It is neither a signed Play upload nor evidence of device acceptance.
2. Keep application ID `com.akipasa` and the existing Play listing. Check that
   versionCode `4` is unused in Play Console before signing. If it has already
   been uploaded, increment the version in a reviewed commit and repeat CI;
   do not change the package or silently rebuild different source.
3. In Play Console, open the app's **App integrity > App signing** page and find
   the **Upload key certificate** SHA-256. Compare it with the existing upload
   keystore and alias using `keytool -list -v -keystore "<existing-keystore>"
-alias "<existing-alias>"`; enter any password at the prompt. Do not generate
   or reset a key for this release. The separate **App signing key certificate**
   is used by Play-delivered APKs and App Links, not for this upload comparison.
4. In the separate project's Android Studio window choose **Build > Generate
   Signed Bundle / APK > Android App Bundle**, module `app`. Select that verified
   existing keystore and alias, enter passwords in Studio, select `release`, and
   generate the signed AAB. Store the result outside Git. If the password is not
   available, the key owner completes this step in Studio; never extract saved
   credentials or place passwords in scripts, chat, logs or project files.
5. Verify the generated file with `jarsigner -verify "<signed-release.aab>"`
   and inspect its certificate with `keytool -printcert -jarfile
"<signed-release.aab>"`. Require a valid content signature and the expected
   upload certificate. Record the signed AAB's SHA-256 and version separately
   from the unsigned CI artifact.
6. In the existing Play app open **Test and release > Testing > Internal
   testing**, create a release, upload only the verified signed AAB, review it,
   and roll it out to the intended internal testers. Install using the tester
   opt-in link and Google Play. Do not create or promote a Production release.
7. Follow the [push runbook](../docs/FOUNDER_ANDROID_PUSH.md) to enable only
   enrollment and the explicit test control when its prerequisites are ready.
   Keep `AKIPASA_PUSH_ENABLED=false`. On the physical Xiaomi/internal build,
   verify actual foreground, background and swipe-away notification delivery,
   then repeat after access-token expiry. Check permission denial/withdrawal,
   logout/account switching, deduplication and cold/warm navigation. Test pushes
   open Staff; check the exact claim link with an authorized existing claim.
   Record device/OS, installed version and outcomes. CI success and Firebase
   acceptance alone do not satisfy this gate; claim delivery remains disabled
   until physical-device acceptance is recorded.

Official references: [Android signing](https://developer.android.com/studio/publish/app-signing)
and [Play Internal testing](https://support.google.com/googleplay/android-developer/answer/9845334).

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
Web layout changes load from the site after a refresh, but immersive system-bar
handling is native; pull the latest branch and reinstall version 1.0.3 to see it.

## Play Console release checklist

- Use the existing Play Console listing for package `com.akipasa`.
- Preserve the existing upload key and verify its certificate as described above.
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
- Version: code `4`, name `1.0.3`.
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
- Verify the upload certificate SHA-256 in Play Console before each new signed
  upload. The upload certificate is not the Google-managed app-signing
  certificate used by Digital Asset Links.
- Validate the signed bundle on Internal testing before Closed or Production.
- The key reset does not resolve the existing policy rejection or complete the
  organisation-account conversion.

## Founder-only claim notifications (FCM)

The Android 1.0.3 source includes native Firebase Cloud Messaging, with enrollment,
test sending and production delivery controlled by separate server gates. All gates
default closed. A Staff/Admin visit first calls the fixed HTTPS eligibility API
using the existing WebView session; only a server-authorized adult founder with
current administrator privileges and an active session can reach Android permission
or token requests. Consumer app launch never initializes an FCM registration.
No Firebase Auth, Firestore or Analytics SDK is included.

Tokens stay in the native SDK and native HTTPS transport; there is no JavaScript
token injection or privileged JavaScript bridge. Registration binds the token to
the current session, and the native code rejects stale account-switch responses.
Delayed denials can revoke only the session snapshot that made the request, so an
old worker cannot delete a newer account's token. WebView session refresh cookies
are retained. Token rotation uses persisted work with up to six attempts and
exponential backoff for temporary network/server failures. SPA navigation, resume and a 30-second
foreground check catch logout, role/session changes and permission withdrawal.
The local token is deleted and displayed founder notifications are cleared when
eligibility is lost. The server independently validates every send and revokes
registrations on logout; multiple authorized devices retain independent records.

FCM must send **data-only** messages. WorkManager keeps background verification
alive after the FCM callback: Android 12+ high-priority messages request expedited
work, with normal persisted work on older devices or when quota is unavailable.
Before showing a notification, the worker revalidates the current session against
the payload and local registration binding. Offline/unavailable authorization
suppresses the notification; email delivery remains independent. Notification
payload text and URLs are never trusted: native EN/ES copy and exact canonical
Staff links are constructed from strict UUIDs. A durable bounded event ledger
suppresses repeated alerts, including after dismissal or app restart. Lock-screen
content is generic and contains no applicant data.

When an operator enables enrollment and the separate test gate, an eligible founder
visiting Staff sees the native **Send test notification** button after registration.
It calls the authenticated, rate-limited `/api/admin/push-test` endpoint for this
device only and creates no claim or customer record. "Firebase accepted" confirms
provider acceptance only; verify an actual Android notification separately. Claim
delivery can remain disabled throughout this test.

See `../docs/FOUNDER_ANDROID_PUSH.md` for credentials, database migration, Firebase
FCM API and rollout gates. A new signed installation is required; a website deploy
does not update native code. Validate foreground, background, swipe-away, Doze,
permission denial/withdrawal, logout/switch/revocation, token rotation and cold/warm
exact-claim navigation on the intended Xiaomi and signed Play internal build.
Include a closed-app delivery after the access token expires to verify server
refresh cookies are persisted and the same active session remains eligible.
Android force-stop, vendor battery restrictions and absent Google Play services
can prevent delivery; source/unit checks do not certify these device conditions.

The `Android/app/google-services.json` file is the public Android client
configuration. It is NOT the privileged Firebase service-account JSON. Never
commit private service-account credentials, Firebase Admin SDK keys, or keystores.

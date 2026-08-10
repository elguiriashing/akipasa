# Tasker voice bridge

## Supported voice trigger

Current Tasker documentation exposes an **Assistant Action** profile event that
can filter spoken commands. Google currently limits that integration to
US-English. AutoVoice's own documentation says Google removed its former
third-party Google Assistant service, so do not build the production flow
around the archived AutoVoice Assistant integration.

Recommended first walkthrough:

1. Set the Android device and Google Assistant language to US-English.
2. In Tasker, create a Profile using `Event > Tasker > Assistant Action`.
3. Filter the command to `send the boys the numbers`.
4. Run the signing bridge through Termux:Task:

   ```sh
   ~/akipasa-automation/akipasa-command.sh "send the boys the numbers"
   ```

5. Store these values in a private Termux configuration file, not in Tasker:
   `AKIPASA_AUTOMATION_URL`, `AKIPASA_DEVICE_ID`, and
   `AKIPASA_SIGNING_SECRET`.
6. Set the file to owner-only access with `chmod 600`.
7. Disable Tasker backup/export for the task containing secret references.

Before loading real investor metrics, use `test the bot` as the Assistant
Action phrase. It exercises the complete signed voice and Telegram path with a
clearly labelled connection message. Switch the profile filter to
`send the boys the numbers` only after current financial rows are loaded.

The signing script generates a fresh timestamp and cryptographic nonce for
every invocation. The Worker independently verifies the HMAC, device ID,
timestamp, and nonce before routing the command.

If Assistant Action is unavailable for the device or language, use Tasker's
one-shot voice recognition/shortcut as the trigger. The HTTPS and signing
steps remain identical.

## Android deployment

Copy `scripts/send-voice-request.mjs` and
`clients/tasker/akipasa-command.sh` to the phone. Node.js is available through
Termux:

```sh
pkg install nodejs
mkdir -p ~/akipasa-automation
mkdir -p ~/.config/akipasa-automation
chmod 700 ~/.config/akipasa-automation
chmod 700 ~/akipasa-automation/akipasa-command.sh
chmod 600 ~/.config/akipasa-automation/env
```

The phone and Worker must share the rotated signing secret. Use a different
device ID and secret version when onboarding another device.

The client rejects non-HTTPS production URLs and stops after five seconds.
It does not automatically retry because a timed-out request may already have
executed; replaying it with the same nonce would be rejected, while generating
a new nonce could duplicate an external action.

package com.akipasa;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.Toast;
import com.google.firebase.messaging.FirebaseMessaging;

/** Enrollment follows verified server identity, including same-document SPA navigation. */
final class FounderPushCoordinator {
    static final int PERMISSION_REQUEST = 1004;
    private final Activity activity;
    private final WebView webView;
    private final Button testButton;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean checking, destroyed, resumed;
    private String lastCookies = "", lastUrl = "", authorizedKey = "", locale = "es";
    private long lastCheck;
    private final Runnable periodic = new Runnable() {
        @Override public void run() { refresh(true); handler.postDelayed(this, 30000); }
    };

    FounderPushCoordinator(Activity activity, WebView webView, Button testButton) {
        this.activity = activity; this.webView = webView; this.testButton = testButton;
        testButton.setOnClickListener(view -> sendTest());
    }

    void resume() { resumed = true; handler.removeCallbacks(periodic); handler.post(periodic); }
    void pause() { resumed = false; handler.removeCallbacks(periodic); }
    void destroy() { destroyed = true; pause(); }

    void refresh(boolean force) {
        if (destroyed || !resumed) return;
        String url = webView.getUrl();
        boolean staff = FounderPushPolicy.isStaffPage(url);
        if (!staff) testButton.setVisibility(View.GONE);
        if (!FounderPushPolicy.isFirstParty(url)) return;
        boolean enrolled = !FounderPushClient.binding(activity).isEmpty()
                || FounderPushClient.state(activity).getBoolean("token_created", false);
        if (!staff && !enrolled) return;
        FounderPushClient.Snapshot snapshot = FounderPushClient.snapshot(activity);
        String cookies = snapshot.cookies;
        if (enrolled && !FounderPushClient.notificationsAllowed(activity)) {
            authorizedKey = ""; testButton.setVisibility(View.GONE);
            FounderPushClient.revokeIfCurrent(activity.getApplicationContext(), snapshot.generation, snapshot.binding, cookies);
            return;
        }
        if (checking || FounderPushClient.isDeleting()) return;
        if (!force && url.equals(lastUrl) && cookies.equals(lastCookies)
                && SystemClock.elapsedRealtime() - lastCheck < 30000) return;
        lastUrl = url; lastCookies = cookies; lastCheck = SystemClock.elapsedRealtime();
        long startedGeneration = snapshot.generation;
        checking = true;
        FounderPushClient.NETWORK.execute(() -> {
            FounderPushClient.Result eligibility = FounderPushClient.request(
                    "GET", "/api/admin/push-devices", cookies, null);
            handler.post(() -> {
                checking = false;
                if (destroyed || !resumed) return;
                String activeCookies = eligibility.effectiveCookies(cookies);
                if (!FounderPushClient.isCurrent(activity, startedGeneration, snapshot.binding, activeCookies)
                        || !current(activeCookies)) { refresh(true); return; }
                String key = eligibility.binding();
                if (key.isEmpty()) {
                    authorizedKey = ""; testButton.setVisibility(View.GONE);
                    if (eligibility.denied()) FounderPushClient.revokeIfCurrent(activity.getApplicationContext(),
                            startedGeneration, snapshot.binding, activeCookies);
                    return;
                }
                String previous = FounderPushClient.binding(activity);
                if (!previous.isEmpty() && !key.equals(previous)) {
                    // Clear old notifications and retire this token before another account enrolls.
                    authorizedKey = "";
                    FounderPushClient.revokeIfCurrent(activity.getApplicationContext(),
                            startedGeneration, snapshot.binding, activeCookies);
                    return;
                }
                authorizedKey = key;
                locale = eligibility.json.optString("locale", "es");
                if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    if (FounderPushPolicy.isStaffPage(webView.getUrl())
                            && !FounderPushClient.state(activity).getBoolean("permission_prompted", false)) {
                        FounderPushClient.state(activity).edit().putBoolean("permission_prompted", true).apply();
                        activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
                    }
                    return;
                }
                if (!FounderPushClient.notificationsAllowed(activity)) return;
                // First enrollment requires a current Staff/Admin page as well as the server check.
                if (previous.isEmpty() && !FounderPushPolicy.isStaffPage(webView.getUrl())) return;
                register(activeCookies, key, previous, eligibility.json.optBoolean("test_enabled"), startedGeneration);
            });
        });
    }

    private boolean current(String cookies) {
        return !destroyed && FounderPushPolicy.isFirstParty(webView.getUrl())
                && cookies.equals(FounderPushClient.cookie());
    }

    private void register(String cookies, String key, String previousKey, boolean testEnabled, long startedGeneration) {
        checking = true;
        FounderPushClient.state(activity).edit().putBoolean("token_created", true).apply();
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) { checking = false; return; }
            // A concurrent deletion may have completed before getToken returned.
            // Keep cleanup pending for the token that has now actually arrived.
            FounderPushClient.state(activity).edit().putBoolean("token_created", true).apply();
            if (destroyed) { checking = false; return; }
            if (startedGeneration != FounderPushClient.generation() || FounderPushClient.isDeleting()) {
                checking = false;
                // Cleanup must not tear down a newer account's completed enrollment.
                synchronized (FounderPushClient.class) {
                    if (FounderPushClient.binding(activity).isEmpty() && !FounderPushClient.isDeleting()) {
                        FounderPushClient.Snapshot cleanup = FounderPushClient.snapshot(activity);
                        FounderPushClient.revokeIfCurrent(activity.getApplicationContext(),
                                cleanup.generation, cleanup.binding, cleanup.cookies);
                    }
                }
                return;
            }
            if (!current(cookies) || !FounderPushClient.notificationsAllowed(activity)) {
                checking = false;
                FounderPushClient.revokeIfCurrent(activity.getApplicationContext(),
                        startedGeneration, previousKey, cookies);
                return;
            }
            String token = task.getResult();
            FounderPushClient.NETWORK.execute(() -> {
                FounderPushClient.Result result = FounderPushClient.request("POST", "/api/admin/push-devices",
                        cookies, FounderPushClient.registration(token, key));
                handler.post(() -> {
                    checking = false;
                    if (destroyed) return;
                    if (startedGeneration != FounderPushClient.generation()) { refresh(true); return; }
                    String activeCookies = result.effectiveCookies(cookies);
                    if (!current(activeCookies)) { testButton.setVisibility(View.GONE); refresh(true); return; }
                    if (result.status != 204) {
                        testButton.setVisibility(View.GONE);
                        if (result.denied()) FounderPushClient.revokeIfCurrent(activity.getApplicationContext(),
                                startedGeneration, previousKey, activeCookies);
                        return;
                    }
                    if (!FounderPushClient.remember(activity, key, token, startedGeneration, activeCookies)) {
                        testButton.setVisibility(View.GONE);
                        refresh(true);
                        return;
                    }
                    testButton.setText(FounderPushClient.text(activity, locale, R.string.push_send_test));
                    testButton.setVisibility(testEnabled && FounderPushPolicy.isStaffPage(webView.getUrl())
                            ? View.VISIBLE : View.GONE);
                });
            });
        });
    }

    private void sendTest() {
        if (checking || !resumed || !FounderPushPolicy.isStaffPage(webView.getUrl()) || authorizedKey.isEmpty()) return;
        FounderPushClient.Snapshot snapshot = FounderPushClient.snapshot(activity);
        String cookies = snapshot.cookies, key = authorizedKey;
        if (!key.equals(snapshot.binding) || FounderPushClient.isDeleting()) return;
        testButton.setEnabled(false);
        FounderPushClient.NETWORK.execute(() -> {
            FounderPushClient.Result eligibility = FounderPushClient.request("GET", "/api/admin/push-devices", cookies, null);
            handler.post(() -> {
                if (destroyed) return;
                if (!key.equals(eligibility.binding()) || !current(eligibility.cookies)
                        || !FounderPushClient.isCurrent(activity, snapshot.generation, key, eligibility.cookies)
                        || FounderPushClient.isDeleting()
                        || !eligibility.json.optBoolean("test_enabled") || !FounderPushClient.notificationsAllowed(activity)) {
                    testButton.setEnabled(true); refresh(true); return;
                }
                FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                    if (!task.isSuccessful() || !current(eligibility.cookies)
                            || !FounderPushClient.isCurrent(activity, snapshot.generation, key, eligibility.cookies)
                            || FounderPushClient.isDeleting() || !FounderPushClient.notificationsAllowed(activity)) {
                        testButton.setEnabled(true); return;
                    }
                    FounderPushClient.NETWORK.execute(() -> {
                        FounderPushClient.Result result = FounderPushClient.request("POST", "/api/admin/push-test",
                                eligibility.cookies, FounderPushClient.registration(task.getResult(), key));
                        handler.post(() -> {
                            if (destroyed) return;
                            testButton.setEnabled(true);
                            Toast.makeText(activity, FounderPushClient.text(activity, locale,
                                    result.status == 200 ? R.string.push_test_accepted : R.string.push_test_failed), Toast.LENGTH_LONG).show();
                        });
                    });
                });
            });
        });
    }
}

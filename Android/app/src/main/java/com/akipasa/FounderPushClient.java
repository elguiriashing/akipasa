package com.akipasa;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.webkit.CookieManager;

import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/** Fixed-origin HTTPS transport. Cookies and FCM tokens never enter page JavaScript or logs. */
final class FounderPushClient {
    static final String ORIGIN = "https://akipasa.com";
    static final String CHANNEL = "akipasa_founder_claims";
    static final ExecutorService NETWORK = Executors.newSingleThreadExecutor();
    private static boolean deleting;
    private static volatile String activeToken;
    private static long generation;

    private FounderPushClient() {}

    static SharedPreferences state(Context context) {
        return context.getSharedPreferences("founder_push", Context.MODE_PRIVATE);
    }

    static String cookie() {
        String value = CookieManager.getInstance().getCookie(ORIGIN);
        return value == null ? "" : value;
    }

    static String binding(Context context) {
        return state(context).getString("registration_key", "");
    }

    static boolean notificationsAllowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
        return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    static String text(Context context, String locale, int resource) {
        Configuration config = new Configuration(context.getResources().getConfiguration());
        config.setLocale(Locale.forLanguageTag("en".equals(locale) ? "en" : "es"));
        return context.createConfigurationContext(config).getString(resource);
    }

    static Result request(String method, String path, String cookies, JSONObject body) {
        if (cookies.isEmpty()) return new Result(403, null);
        HttpsURLConnection connection = null;
        try {
            // No arbitrary host/path, redirects, client identity, or provider credentials.
            if (!"/api/admin/push-devices".equals(path) && !"/api/admin/push-test".equals(path))
                return new Result(403, null);
            connection = (HttpsURLConnection) new URL(ORIGIN + path).openConnection();
            connection.setRequestMethod(method);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(5000);
            // Test sending includes two bounded provider calls; verification runs
            // in persistent work, outside Firebase's short receive callback.
            connection.setReadTimeout("/api/admin/push-test".equals(path) ? 20000 : 8000);
            connection.setUseCaches(false);
            connection.setRequestProperty("Origin", ORIGIN);
            connection.setRequestProperty("Cookie", cookies);
            connection.setRequestProperty("User-Agent", "AkiPasaAndroid/" + BuildConfig.VERSION_NAME);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            int status = connection.getResponseCode();
            String responseCookies = cookies;
            // Preserve Supabase's rotated session cookies without allowing an old
            // request to overwrite a more recent account switch in the WebView.
            synchronized (FounderPushClient.class) {
                if (cookies.equals(cookie())) {
                    for (java.util.Map.Entry<String, java.util.List<String>> header : connection.getHeaderFields().entrySet()) {
                        if ("set-cookie".equalsIgnoreCase(header.getKey()))
                            for (String value : header.getValue()) CookieManager.getInstance().setCookie(ORIGIN, value);
                    }
                    CookieManager.getInstance().flush();
                    responseCookies = cookie();
                }
            }
            if (status != 200) return new Result(status, null, responseCookies);
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[1024];
                int size;
                while ((size = input.read(buffer)) != -1) {
                    if (output.size() + size > 8192) return new Result(0, null);
                    output.write(buffer, 0, size);
                }
                return new Result(status, new JSONObject(output.toString(StandardCharsets.UTF_8.name())), responseCookies);
            }
        } catch (Exception ignored) {
            return new Result(0, null); // Offline, expired, malformed and unavailable all fail closed.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    static JSONObject registration(String token, String binding) {
        JSONObject body = new JSONObject();
        try { body.put("token", token); body.put("registration_key", binding); }
        catch (org.json.JSONException ignored) { /* Constant field names and non-null values. */ }
        return body;
    }

    static synchronized long generation() { return generation; }

    static synchronized Snapshot snapshot(Context context) {
        return new Snapshot(generation, binding(context), cookie());
    }

    static synchronized boolean isCurrent(Context context, long startedGeneration, String key, String cookies) {
        return FounderPushPolicy.isCurrentSnapshot(startedGeneration, generation,
                key, binding(context), cookies, cookie());
    }

    static synchronized boolean isCurrentRegistration(Context context, long startedGeneration, String key) {
        return generation == startedGeneration && key.equals(binding(context));
    }

    static synchronized void revokeIfCurrent(Context context, long startedGeneration, String key, String cookies) {
        // A delayed old-session denial must not delete a newer account's provider token.
        if (isCurrent(context, startedGeneration, key, cookies)) revoke(context, cookies);
    }

    static synchronized boolean remember(Context context, String binding, String token,
                                         long startedGeneration, String cookies) {
        // This check and the state write share revoke's lock. An earlier successful
        // POST cannot resurrect enrollment after logout or permission withdrawal.
        if (!FounderPushPolicy.mayRememberRegistration(startedGeneration, generation, deleting,
                notificationsAllowed(context), binding, binding(context), cookies, cookie())) return false;
        activeToken = token;
        state(context).edit().putString("registration_key", binding).putBoolean("token_created", true).apply();
        return true;
    }

    static void forget(Context context) {
        state(context).edit().remove("registration_key").apply();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) for (android.service.notification.StatusBarNotification notification : manager.getActiveNotifications()) {
            if (CHANNEL.equals(notification.getNotification().getChannelId()))
                manager.cancel(notification.getTag(), notification.getId());
        }
    }

    static synchronized boolean isDeleting() { return deleting; }

    static synchronized void revoke(Context context, String cookies) {
        generation++;
        forget(context);
        if (deleting || !state(context).getBoolean("token_created", false)) return;
        deleting = true;
        // Only a previously enrolled installation reaches the Firebase API here.
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();
        messaging.setAutoInitEnabled(false);
        String token = activeToken;
        activeToken = null;
        if (token != null) NETWORK.execute(() -> {
            JSONObject body = new JSONObject();
            try { body.put("token", token); } catch (org.json.JSONException ignored) { }
            request("DELETE", "/api/admin/push-devices", cookies, body);
        });
        // Never call getToken after eligibility is lost. Deleting the provider token
        // invalidates it even when the server session is already gone.
        messaging.deleteToken().addOnCompleteListener(deleted -> {
            if (deleted.isSuccessful()) state(context).edit().putBoolean("token_created", false).apply();
            synchronized (FounderPushClient.class) { deleting = false; }
        });
    }

    static final class Result {
        final int status;
        final JSONObject json;
        final String cookies;
        final boolean hasCookieSnapshot;
        Result(int status, JSONObject json) {
            this.status = status; this.json = json; this.cookies = ""; this.hasCookieSnapshot = false;
        }
        Result(int status, JSONObject json, String cookies) {
            this.status = status; this.json = json; this.cookies = cookies; this.hasCookieSnapshot = true;
        }
        String binding() {
            String key = json == null ? "" : json.optString("registration_key");
            return status == 200 && json != null && json.optBoolean("eligible") && FounderPushPolicy.isUuid(key) ? key : "";
        }
        boolean denied() { return status == 401 || status == 403 || status == 404; }
        boolean retryable() { return status == 0 || status == 408 || status == 429 || status >= 500; }
        String effectiveCookies(String requestCookies) { return hasCookieSnapshot ? cookies : requestCookies; }
    }

    static final class Snapshot {
        final long generation;
        final String binding, cookies;
        Snapshot(long generation, String binding, String cookies) {
            this.generation = generation; this.binding = binding; this.cookies = cookies;
        }
    }
}

package com.akipasa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.Tasks;
import androidx.work.Constraints;
import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** The same data-only path handles foreground/background deliveries. No payload text is rendered. */
public final class AkiPasaMessagingService extends FirebaseMessagingService {
    @Override
    public void onNewToken(String token) {
        if (FounderPushClient.binding(this).isEmpty()) return;
        WorkManager.getInstance(this).enqueueUniqueWork("founder-push-token", ExistingWorkPolicy.APPEND_OR_REPLACE,
                new OneTimeWorkRequest.Builder(FounderPushWorker.class)
                        .setInputData(new Data.Builder().putBoolean("rotation", true).build())
                        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                        .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build());
    }

    /** False means a transient rotation failure that WorkManager should retry. */
    static boolean refreshToken(Context context) {
        // Auto-init stays disabled. Rotation can only renew a previously enrolled installation.
        FounderPushClient.Snapshot snapshot = FounderPushClient.snapshot(context);
        String key = snapshot.binding, cookies = snapshot.cookies;
        long startedGeneration = snapshot.generation;
        if (key.isEmpty()) return true;
        if (!FounderPushClient.notificationsAllowed(context)) {
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return true;
        }
        FounderPushClient.Result eligibility = FounderPushClient.request("GET", "/api/admin/push-devices", cookies, null);
        cookies = eligibility.effectiveCookies(cookies);
        if (!FounderPushClient.isCurrent(context, startedGeneration, key, cookies))
            return !FounderPushClient.isCurrentRegistration(context, startedGeneration, key);
        if (!key.equals(eligibility.binding())) {
            if (eligibility.denied() || !eligibility.binding().isEmpty())
                FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return !eligibility.retryable();
        }
        String token;
        if (FounderPushClient.isDeleting()) return true;
        if (!FounderPushClient.notificationsAllowed(context)) {
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return true;
        }
        try { token = Tasks.await(FirebaseMessaging.getInstance().getToken(), 5, TimeUnit.SECONDS); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return false; }
        catch (Exception ignored) { return false; }
        if (!FounderPushClient.isCurrent(context, startedGeneration, key, cookies)
                || FounderPushClient.isDeleting())
            return !FounderPushClient.isCurrentRegistration(context, startedGeneration, key);
        if (!FounderPushClient.notificationsAllowed(context)) {
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return true;
        }
        FounderPushClient.Result registered = FounderPushClient.request("POST", "/api/admin/push-devices",
                cookies, FounderPushClient.registration(token, key));
        cookies = registered.effectiveCookies(cookies);
        if (!FounderPushClient.isCurrent(context, startedGeneration, key, cookies))
            return !FounderPushClient.isCurrentRegistration(context, startedGeneration, key);
        if (!FounderPushClient.notificationsAllowed(context)) {
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return true;
        }
        if (registered.status == 204)
            return FounderPushClient.remember(context, key, token, startedGeneration, cookies)
                    || !FounderPushClient.isCurrentRegistration(context, startedGeneration, key);
        if (registered.denied())
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
        return !registered.retryable();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String eventKey = FounderPushPolicy.eventKey(data);
        if (eventKey == null || message.getNotification() != null) return;
        Data.Builder input = new Data.Builder().putLong("sent_at", message.getSentTime());
        for (String field : new String[]{"type", "event_id", "claim_id", "test_id", "registration_key", "locale"})
            if (data.get(field) != null) input.putString(field, data.get(field));
        OneTimeWorkRequest.Builder work = new OneTimeWorkRequest.Builder(FounderPushWorker.class)
                .setInputData(input.build())
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build());
        // Older Android's expedited fallback needs a foreground notification before
        // authorization. Use ordinary persistent work there instead.
        if (Build.VERSION.SDK_INT >= 31 && message.getPriority() == RemoteMessage.PRIORITY_HIGH)
            work.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        WorkManager.getInstance(this).enqueueUniqueWork("founder-push:" + eventKey,
                ExistingWorkPolicy.KEEP, work.build());
    }

    static void display(Context context, Map<String, String> data, long sentAt) {
        String eventKey = FounderPushPolicy.eventKey(data), link = FounderPushPolicy.destination(data);
        if (eventKey == null || link == null) return;
        FounderPushClient.Snapshot snapshot = FounderPushClient.snapshot(context);
        String key = snapshot.binding, cookies = snapshot.cookies;
        long startedGeneration = snapshot.generation;
        if (key.isEmpty()) return;
        if (!FounderPushClient.notificationsAllowed(context)) {
            FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return;
        }
        // Revalidate the current WebView session before showing even generic lock-screen text.
        // Offline/unavailable auth suppresses the push; the independent email remains available.
        FounderPushClient.Result eligibility = FounderPushClient.request("GET", "/api/admin/push-devices", cookies, null);
        cookies = eligibility.effectiveCookies(cookies);
        if (!FounderPushClient.isCurrent(context, startedGeneration, key, cookies)) return;
        if (!FounderPushPolicy.mayDisplay(data.get("registration_key"), key, eligibility.binding(),
                sentAt, System.currentTimeMillis())) {
            if (eligibility.denied() || (!eligibility.binding().isEmpty() && !key.equals(eligibility.binding())))
                FounderPushClient.revokeIfCurrent(context, startedGeneration, key, cookies);
            return;
        }
        if (!FounderPushClient.notificationsAllowed(context) || !key.equals(FounderPushClient.binding(context))) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        String locale = data.get("locale");
        NotificationChannel channel = new NotificationChannel(FounderPushClient.CHANNEL,
                FounderPushClient.text(context, locale, R.string.push_channel), NotificationManager.IMPORTANCE_HIGH);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
        Intent intent = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(link))
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification publicVersion = new Notification.Builder(context, FounderPushClient.CHANNEL)
                .setSmallIcon(R.drawable.ic_notification).setContentTitle("AkiPasa Admin")
                .setContentText(FounderPushClient.text(context, locale, R.string.push_private)).build();
        Notification notification = new Notification.Builder(context, FounderPushClient.CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_launcher_foreground))
                .setContentTitle("AkiPasa Admin")
                .setContentText(FounderPushClient.text(context, locale, "founder_test".equals(data.get("type"))
                        ? R.string.push_test_body : R.string.push_claim_body))
                .setContentIntent(pending).setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPublicVersion(publicVersion).setCategory(Notification.CATEGORY_STATUS)
                .setOnlyAlertOnce(true).setAutoCancel(true).build();
        // A tag avoids Java hash collisions. Durable bounded dedupe survives dismissal/restart.
        synchronized (FounderPushClient.class) {
            if (!FounderPushClient.isCurrent(context, startedGeneration, key, cookies)
                    || !FounderPushClient.notificationsAllowed(context)) return;
            SharedPreferences seen = context.getSharedPreferences("founder_push_seen", MODE_PRIVATE);
            long now = System.currentTimeMillis();
            if (seen.getLong(eventKey, 0) > now - FounderPushPolicy.MAX_AGE_MS) return;
            try { manager.notify(eventKey, 0, notification); }
            catch (SecurityException ignored) { return; }
            SharedPreferences.Editor edit = seen.edit();
            for (Map.Entry<String, ?> entry : seen.getAll().entrySet()) {
                if (!(entry.getValue() instanceof Long) || (Long) entry.getValue() < now - FounderPushPolicy.MAX_AGE_MS)
                    edit.remove(entry.getKey());
            }
            if (seen.getAll().size() >= 100) {
                String oldest = null; long oldestAt = Long.MAX_VALUE;
                for (Map.Entry<String, ?> entry : seen.getAll().entrySet()) {
                    if (entry.getValue() instanceof Long && (Long) entry.getValue() < oldestAt) {
                        oldest = entry.getKey(); oldestAt = (Long) entry.getValue();
                    }
                }
                if (oldest != null) edit.remove(oldest);
            }
            edit.putLong(eventKey, now).commit();
        }
    }
}

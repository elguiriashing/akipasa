package com.akipasa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import java.util.UUID;

/** Data-only FCM messages. Never trust a URL or contact details in a push payload. */
public final class AkiPasaMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "akipasa_founder_claims";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (!"venue_claim".equals(data.get("type"))) return;
        String id = data.get("claim_id");
        if (id == null) return;
        try {
            UUID.fromString(id);
        } catch (IllegalArgumentException ignored) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL, "AkiPasa founder requests", NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(channel);
        }
        Uri link = Uri.parse("https://akipasa.com/en/staff/moderation")
                .buildUpon().appendQueryParameter("queue", "claims")
                .appendQueryParameter("claim", id).build();
        Intent intent = new Intent(this, MainActivity.class)
                .setAction(Intent.ACTION_VIEW)
                .setData(link)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                this, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.drawable.ic_launcher_foreground))
                .setContentTitle("AkiPasa · New ownership claim")
                .setContentText("A venue claim is awaiting verification.")
                .setContentIntent(pending)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setCategory(Notification.CATEGORY_STATUS)
                .setAutoCancel(true)
                .build();
        manager.notify(id.hashCode(), notification);
    }
}

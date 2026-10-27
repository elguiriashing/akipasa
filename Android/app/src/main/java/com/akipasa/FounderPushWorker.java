package com.akipasa;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.HashMap;
import java.util.Map;

/** WorkManager keeps bounded session verification alive after the FCM callback returns. */
public final class FounderPushWorker extends Worker {
    public FounderPushWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull @Override public Result doWork() {
        if (getInputData().getBoolean("rotation", false)) {
            // At most six attempts with exponential backoff; ineligible/stale work is terminal.
            if (!AkiPasaMessagingService.refreshToken(getApplicationContext()) && getRunAttemptCount() < 5)
                return Result.retry();
        } else {
            Map<String, String> data = new HashMap<>();
            for (String field : new String[]{"type", "event_id", "claim_id", "test_id", "registration_key", "locale"})
                data.put(field, getInputData().getString(field));
            AkiPasaMessagingService.display(getApplicationContext(), data, getInputData().getLong("sent_at", 0));
        }
        return Result.success();
    }
}

package com.akipasa;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Map;
import java.util.regex.Pattern;

/** Pure validation shared by enrollment and the data-only receiver. */
final class FounderPushPolicy {
    private static final Pattern UUID = Pattern.compile(
            "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    static final long MAX_AGE_MS = 60 * 60 * 1000L;

    private FounderPushPolicy() {}

    static boolean isUuid(String value) {
        return value != null && UUID.matcher(value).matches();
    }

    static boolean isFirstParty(String value) {
        if (value == null) return false;
        try {
            URI uri = new URI(value);
            return "https".equals(uri.getScheme()) && "akipasa.com".equals(uri.getHost())
                    && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (URISyntaxException error) {
            return false;
        }
    }

    static boolean isStaffPage(String value) {
        if (!isFirstParty(value)) return false;
        return URI.create(value).getRawPath().matches("/(en|es)/(staff|admin)(/.*)?");
    }

    static String eventKey(Map<String, String> data) {
        String type = data.get("type"), id = data.get("event_id");
        if (!isUuid(id) || !isUuid(data.get("registration_key"))) return null;
        if (!"en".equals(data.get("locale")) && !"es".equals(data.get("locale"))) return null;
        if ("venue_claim".equals(type) && id.equals(data.get("claim_id"))) return type + ":" + id;
        if ("founder_test".equals(type) && id.equals(data.get("test_id"))) return type + ":" + id;
        return null;
    }

    static String destination(Map<String, String> data) {
        if (eventKey(data) == null) return null;
        String base = "https://akipasa.com/" + data.get("locale") + "/staff";
        return "venue_claim".equals(data.get("type"))
                ? base + "/moderation?queue=claims&claim=" + data.get("claim_id") : base;
    }

    static boolean mayDisplay(String payloadBinding, String localBinding, String currentBinding,
                              long sentAt, long now) {
        return isUuid(payloadBinding) && payloadBinding.equals(localBinding)
                && payloadBinding.equals(currentBinding) && sentAt > 0
                && sentAt <= now + 5 * 60 * 1000L && sentAt >= now - MAX_AGE_MS;
    }

    static boolean mayRememberRegistration(long startedGeneration, long currentGeneration,
                                           boolean deleting, boolean permissionGranted,
                                           String key, String previousKey,
                                           String requestCookies, String currentCookies) {
        return startedGeneration == currentGeneration && !deleting && permissionGranted
                && isUuid(key) && (previousKey.isEmpty() || key.equals(previousKey))
                && !requestCookies.isEmpty() && requestCookies.equals(currentCookies);
    }

    static boolean isCurrentSnapshot(long startedGeneration, long currentGeneration,
                                     String expectedKey, String currentKey,
                                     String expectedCookies, String currentCookies) {
        return startedGeneration == currentGeneration && expectedKey.equals(currentKey)
                && expectedCookies.equals(currentCookies);
    }
}

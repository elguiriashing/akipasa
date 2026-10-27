package com.akipasa;

import org.junit.Test;
import java.util.HashMap;
import java.util.Map;
import static org.junit.Assert.*;

public class FounderPushPolicyTest {
    private static final String ID = "0a0a0a0a-1111-2222-3333-123456789abc";
    private static final String SESSION = "bbbbbbbb-1111-2222-3333-123456789abc";
    private Map<String, String> claim(String locale) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "venue_claim"); data.put("claim_id", ID); data.put("event_id", ID);
        data.put("registration_key", SESSION); data.put("locale", locale);
        return data;
    }

    @Test public void enrollmentOnlyOnCanonicalStaffAndAdminPages() {
        assertTrue(FounderPushPolicy.isStaffPage("https://akipasa.com/en/staff/moderation?queue=claims"));
        assertTrue(FounderPushPolicy.isStaffPage("https://akipasa.com/es/admin"));
        for (String url : new String[]{"https://akipasa.com/es", "https://www.akipasa.com/en/staff",
                "https://akipasa.com:444/en/staff", "https://x@akipasa.com/en/staff",
                "http://akipasa.com/en/staff", "https://akipasa.com.evil.test/en/staff",
                "https://akipasa.com/en/staffing", "https://akipasa.com/en/%73taff"})
            assertFalse(url, FounderPushPolicy.isStaffPage(url));
    }

    @Test public void firstPartyCheckRejectsUntrustedUrls() {
        assertFalse(FounderPushPolicy.isFirstParty(null));
        assertFalse(FounderPushPolicy.isFirstParty("javascript:alert(1)"));
        assertFalse(FounderPushPolicy.isFirstParty("https://[broken"));
        assertTrue(FounderPushPolicy.isFirstParty("https://akipasa.com:443/en/account"));
    }

    @Test public void exactClaimLinkUsesOnlyValidatedIdsAndLocale() {
        for (String locale : new String[]{"en", "es"}) {
            Map<String, String> data = claim(locale);
            data.put("url", "https://evil.test"); data.put("title", "Private applicant");
            assertEquals("https://akipasa.com/" + locale + "/staff/moderation?queue=claims&claim=" + ID,
                    FounderPushPolicy.destination(data));
        }
    }

    @Test public void malformedAndMismatchedIdsAreRejected() {
        Map<String, String> data = claim("en");
        data.put("claim_id", "1-1-1-1-1"); assertNull(FounderPushPolicy.eventKey(data));
        data.put("claim_id", SESSION); assertNull(FounderPushPolicy.eventKey(data));
        data.put("claim_id", ID); data.put("registration_key", ""); assertNull(FounderPushPolicy.eventKey(data));
    }

    @Test public void unknownTypesLocalesAndMissingDataAreRejected() {
        assertNull(FounderPushPolicy.destination(new HashMap<>()));
        assertNull(FounderPushPolicy.destination(claim("../en")));
        Map<String, String> data = claim("es"); data.put("type", "admin_grant");
        assertNull(FounderPushPolicy.destination(data));
    }

    @Test public void testNotificationHasNoClaimDestination() {
        Map<String, String> data = claim("es");
        data.put("type", "founder_test"); data.put("test_id", ID); data.remove("claim_id");
        assertEquals("https://akipasa.com/es/staff", FounderPushPolicy.destination(data));
        assertEquals("founder_test:" + ID, FounderPushPolicy.eventKey(data));
    }

    @Test public void freshMatchingSessionIsRequired() {
        long now = 10_000_000L;
        assertTrue(FounderPushPolicy.mayDisplay(SESSION, SESSION, SESSION, now, now));
        assertFalse(FounderPushPolicy.mayDisplay(SESSION, "", SESSION, now, now));
        assertFalse(FounderPushPolicy.mayDisplay(SESSION, SESSION, "", now, now));
        assertFalse(FounderPushPolicy.mayDisplay(SESSION, SESSION, ID, now, now));
        assertFalse(FounderPushPolicy.mayDisplay(ID, SESSION, SESSION, now, now));
    }

    @Test public void staleMissingOrFutureMessagesAreSuppressed() {
        long now = 10_000_000L;
        for (long sent : new long[]{0, now - FounderPushPolicy.MAX_AGE_MS - 1, now + 300001})
            assertFalse(FounderPushPolicy.mayDisplay(SESSION, SESSION, SESSION, sent, now));
    }

    @Test public void duplicateRetriesShareOneStableEventKey() {
        Map<String, String> first = claim("en"), retry = claim("es");
        retry.put("fcm_message_id", "a-new-provider-attempt");
        assertEquals(FounderPushPolicy.eventKey(first), FounderPushPolicy.eventKey(retry));
    }

    @Test public void successfulRegistrationCannotRestoreRevokedOrBlockedState() {
        assertTrue(FounderPushPolicy.mayRememberRegistration(1, 1, false, true,
                SESSION, "", "current-session-cookie", "current-session-cookie"));
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 2, false, true,
                SESSION, "", "current-session-cookie", "current-session-cookie"));
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 1, true, true,
                SESSION, SESSION, "current-session-cookie", "current-session-cookie"));
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 1, false, false,
                SESSION, SESSION, "current-session-cookie", "current-session-cookie"));
    }

    @Test public void staleRegistrationCannotOverwriteAnAccountSwitch() {
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 1, false, true,
                SESSION, ID, "current-session-cookie", "current-session-cookie"));
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 1, false, true,
                SESSION, "", "old-session-cookie", "current-session-cookie"));
        assertFalse(FounderPushPolicy.mayRememberRegistration(1, 1, false, true,
                SESSION, "", "", ""));
    }

    @Test public void delayedDenialCannotRevokeANewerSessionOrGeneration() {
        assertTrue(FounderPushPolicy.isCurrentSnapshot(1, 1, SESSION, SESSION, "cookie", "cookie"));
        assertFalse(FounderPushPolicy.isCurrentSnapshot(1, 2, SESSION, SESSION, "cookie", "cookie"));
        assertFalse(FounderPushPolicy.isCurrentSnapshot(1, 1, SESSION, ID, "cookie", "cookie"));
        assertFalse(FounderPushPolicy.isCurrentSnapshot(1, 1, SESSION, SESSION, "old", "new"));
        assertFalse(FounderPushPolicy.isCurrentSnapshot(1, 1, "", SESSION, "cookie", "cookie"));
    }
}

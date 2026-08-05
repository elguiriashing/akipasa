package com.akipasa;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class NavigationPolicyTest {
    @Test
    public void internalNavigationRequiresHttpsAndExactHost() {
        assertTrue(NavigationPolicy.isInternal("https://akipasa.com/es/events/demo"));
        assertTrue(NavigationPolicy.isInternal("https://www.akipasa.com/en"));
        assertFalse(NavigationPolicy.isInternal("http://akipasa.com/es"));
        assertFalse(NavigationPolicy.isInternal("https://akipasa.com.evil.example/es"));
    }

    @Test
    public void externalNavigationRejectsExecutableAndUnknownSchemes() {
        assertTrue(NavigationPolicy.canOpenExternally("mailto:hola@example.com"));
        assertTrue(NavigationPolicy.canOpenExternally("https://checkout.stripe.com/demo"));
        assertFalse(NavigationPolicy.canOpenExternally("javascript:alert(1)"));
        assertFalse(NavigationPolicy.canOpenExternally("file:///data/local/tmp/demo"));
        assertFalse(NavigationPolicy.canOpenExternally("intent://unsafe"));
    }

    @Test
    public void downloadsAreLimitedToOwnedAndStorageHosts() {
        assertTrue(NavigationPolicy.canDownload("https://akipasa.com/es/account/export"));
        assertTrue(NavigationPolicy.canDownload("https://project.supabase.co/storage/object"));
        assertFalse(NavigationPolicy.canDownload("https://evil.example/payload.apk"));
        assertFalse(NavigationPolicy.canDownload("data:text/plain,secret"));
    }
}

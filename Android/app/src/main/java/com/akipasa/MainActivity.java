package com.akipasa;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int LOCATION_PERMISSION_REQUEST = 1002;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1003;
    private static final String DEBUG_NOTIFICATION_ACTION = "com.akipasa.DEBUG_NOTIFICATION";
    private static final String DEBUG_NOTIFICATION_CHANNEL = "akipasa_debug";

    private WebView webView;
    private ProgressBar progressBar;
    private View offlineView;
    private ValueCallback<Uri[]> fileCallback;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private boolean mainFrameFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(getColor(R.color.akipasa_status));
        getWindow().setNavigationBarColor(getColor(R.color.akipasa_background));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        // DecorView is not installed until setContentView; don't request insets yet.
        FrameLayout root = buildLayout();
        if (Build.VERSION.SDK_INT >= 28) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(
                        cutout == null ? 0 : cutout.getSafeInsetLeft(),
                        cutout == null ? 0 : cutout.getSafeInsetTop(),
                        cutout == null ? 0 : cutout.getSafeInsetRight(),
                        cutout == null ? 0 : cutout.getSafeInsetBottom()
                );
                // The root owns cutout spacing; the WebView still receives IME insets.
                return insets.consumeDisplayCutout();
            });
        }
        setContentView(root);
        // Apply immersive mode only after the view is attached to a window.
        root.post(this::hideSystemBars);
        configureWebView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    this::handleBack
            );
        }

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadLaunchUrl(getIntent());
        }
        if (getIntent() != null && DEBUG_NOTIFICATION_ACTION.equals(getIntent().getAction())) {
            showDebugNotification();
        }
    }

    private void showDebugNotification() {
        // Local development exercise only: release builds cannot post via this trigger.
        if (!BuildConfig.DEBUG) return;
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(
                    DEBUG_NOTIFICATION_CHANNEL, "AkiPasa development tests",
                    NotificationManager.IMPORTANCE_HIGH));
        }
        Notification notification = new Notification.Builder(this, DEBUG_NOTIFICATION_CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.drawable.ic_launcher_foreground))
                .setContentTitle("AkiPasa test notification")
                .setContentText("Native Android notifications are working! 🚀")
                .setAutoCancel(true)
                .build();
        manager.notify(1003, notification);
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            View decorView = getWindow().getDecorView();
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private FrameLayout buildLayout() {
        FrameLayout root = new FrameLayout(this);
        // Color the camera-cutout safe area like the header rather than showing a cream stripe.
        root.setBackgroundColor(getColor(R.color.akipasa_status));

        webView = new WebView(this);
        webView.setId(View.generateViewId());
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        offlineView = buildOfflineView();
        offlineView.setVisibility(View.GONE);
        root.addView(offlineView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(getColorStateList(R.color.akipasa_primary));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(4)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);
        return root;
    }

    private View buildOfflineView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(getColor(R.color.akipasa_background));

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextColor(getColor(R.color.akipasa_ink));
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);

        TextView message = new TextView(this);
        message.setText(R.string.offline_message);
        message.setTextColor(getColor(R.color.akipasa_ink));
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        messageParams.setMargins(0, dp(12), 0, dp(24));
        panel.addView(message, messageParams);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(view -> {
            offlineView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            mainFrameFailed = false;
            webView.reload();
        });
        panel.addView(retry);
        return panel;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " AkiPasaAndroid/" + BuildConfig.VERSION_NAME);

        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setWebViewClient(new AkiPasaWebViewClient());
        webView.setWebChromeClient(new AkiPasaChromeClient());
        webView.setDownloadListener(this::download);
    }

    private void loadLaunchUrl(Intent intent) {
        Uri deepLink = intent == null ? null : intent.getData();
        webView.loadUrl(resolveLaunchUrl(deepLink));
    }

    private String resolveLaunchUrl(Uri deepLink) {
        if (deepLink == null) return BuildConfig.APP_URL;
        String callback = NavigationPolicy.appCallbackUrl(deepLink.toString());
        if (callback != null) return callback;
        if (!NavigationPolicy.isInternal(deepLink.toString())) return BuildConfig.APP_URL;
        if ("1".equals(deepLink.getQueryParameter("android"))
                && deepLink.getPath() != null && deepLink.getPath().matches("/(en|es)/auth/callback")) {
            return deepLink.buildUpon().appendQueryParameter("native", "1").build().toString();
        }
        return deepLink.toString();
    }

    private boolean openExternal(Uri uri) {
        if (!NavigationPolicy.canOpenExternally(uri.toString())) {
            Toast.makeText(this, R.string.cannot_open_link, Toast.LENGTH_SHORT).show();
            return true;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.cannot_open_link, Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void download(String url, String userAgent, String contentDisposition, String mimeType, long size) {
        Uri uri = Uri.parse(url);
        if (!NavigationPolicy.canDownload(uri.toString())) {
            openExternal(uri);
            return;
        }
        try {
            DownloadManager.Request request = new DownloadManager.Request(uri)
                    .setMimeType(mimeType)
                    .setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .addRequestHeader("User-Agent", userAgent);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isBlank()) request.addRequestHeader("Cookie", cookie);
            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show();
        } catch (IllegalArgumentException | SecurityException error) {
            openExternal(uri);
        }
    }

    private void requestLocation(String origin, GeolocationPermissions.Callback callback) {
        Uri uri = Uri.parse(origin);
        if (!NavigationPolicy.isInternal(uri.toString())) {
            callback.invoke(origin, false, false);
            return;
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            callback.invoke(origin, true, false);
            return;
        }
        locationOrigin = origin;
        locationCallback = callback;
        requestPermissions(new String[]{
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
        }, LOCATION_PERMISSION_REQUEST);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (BuildConfig.DEBUG && DEBUG_NOTIFICATION_ACTION.equals(intent.getAction())) {
            showDebugNotification();
            return;
        }
        Uri uri = intent.getData();
        if (uri != null && (NavigationPolicy.isInternal(uri.toString())
                || NavigationPolicy.appCallbackUrl(uri.toString()) != null)) {
            webView.loadUrl(resolveLaunchUrl(uri));
        }
    }

    @Override
    @SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (webView.canGoBack()) webView.goBack();
        else finish();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clipData = data.getClipData();
            if (clipData != null) {
                List<Uri> selected = new ArrayList<>();
                for (int index = 0; index < clipData.getItemCount(); index++) {
                    selected.add(clipData.getItemAt(index).getUri());
                }
                result = selected.toArray(new Uri[0]);
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                showDebugNotification();
            }
            return;
        }
        if (requestCode != LOCATION_PERMISSION_REQUEST || locationCallback == null) return;
        boolean granted = false;
        for (int result : grantResults) granted |= result == PackageManager.PERMISSION_GRANTED;
        locationCallback.invoke(locationOrigin, granted, false);
        locationCallback = null;
        locationOrigin = null;
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (locationCallback != null) locationCallback.invoke(locationOrigin, false, false);
        webView.stopLoading();
        webView.setWebChromeClient(null);
        webView.setWebViewClient(null);
        webView.destroy();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class AkiPasaWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (NavigationPolicy.isInternal(uri.toString())) return false;
            return openExternal(uri);
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            mainFrameFailed = false;
            offlineView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            if (mainFrameFailed) {
                webView.setVisibility(View.GONE);
                offlineView.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) mainFrameFailed = true;
        }
    }

    private final class AkiPasaChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int progress) {
            progressBar.setProgress(progress);
            progressBar.setVisibility(progress < 100 ? View.VISIBLE : View.GONE);
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            requestLocation(origin, callback);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(acceptedMimeType(params.getAcceptTypes()))
                    .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
            try {
                startActivityForResult(Intent.createChooser(intent, getString(R.string.app_name)), FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException error) {
                fileCallback.onReceiveValue(null);
                fileCallback = null;
                return false;
            }
        }

        private String acceptedMimeType(String[] acceptedTypes) {
            if (acceptedTypes == null || acceptedTypes.length == 0) return "*/*";
            boolean imagesOnly = true;
            int validTypes = 0;
            for (String type : acceptedTypes) {
                if (type == null || !type.contains("/") || type.contains(",")) continue;
                validTypes++;
                imagesOnly &= type.startsWith("image/");
            }
            if (imagesOnly && validTypes > 0) return "image/*";
            if (validTypes == 1) {
                for (String type : acceptedTypes) if (type != null && type.contains("/")) return type;
            }
            return "*/*";
        }
    }
}

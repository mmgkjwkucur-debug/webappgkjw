package com.gkjwkucur.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.Window;
import android.graphics.Color;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private StartupSplashView startupSplash;
    private boolean splashHiding;
    private final Runnable splashTimeout = this::hideStartupSplash;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(6, 37, 29));
        window.setNavigationBarColor(Color.rgb(4, 28, 24));

        ViewGroup content = findViewById(android.R.id.content);
        startupSplash = new StartupSplashView(this);
        content.addView(startupSplash, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    splashHandler.postDelayed(MainActivity.this::hideStartupSplash, 500);
                }
            });
        }

        splashHandler.postDelayed(splashTimeout, 12000);
    }

    private void hideStartupSplash() {
        if (startupSplash == null || startupSplash.getParent() == null || splashHiding) return;
        splashHiding = true;

        startupSplash.animate()
            .alpha(0f)
            .setDuration(450)
            .withEndAction(() -> {
                ViewGroup parent = (ViewGroup) startupSplash.getParent();
                if (parent != null) parent.removeView(startupSplash);
                startupSplash = null;
            })
            .start();
    }

    @Override
    public void onDestroy() {
        splashHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}

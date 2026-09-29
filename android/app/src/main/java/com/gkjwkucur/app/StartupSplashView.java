package com.gkjwkucur.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

final class StartupSplashView extends FrameLayout {
    private final ValueAnimator pulseAnimator;
    private final ValueAnimator ringAnimator;
    private final ValueAnimator progressAnimator;
    private final View halo;
    private final View logoCard;
    private final RingView ring;
    private final ProgressView progress;

    StartupSplashView(Context context) {
        super(context);
        setAlpha(1f);
        setBackground(new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[] { Color.rgb(4, 28, 24), Color.rgb(8, 58, 43), Color.rgb(5, 38, 31) }
        ));

        int gold = Color.rgb(224, 187, 111);
        int cream = Color.rgb(251, 248, 239);

        LinearLayout content = new LinearLayout(context);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);

        FrameLayout emblem = new FrameLayout(context);
        int emblemSize = dp(156);

        halo = new View(context);
        GradientDrawable haloShape = new GradientDrawable();
        haloShape.setShape(GradientDrawable.OVAL);
        haloShape.setColor(0x1FDEBB6F);
        halo.setBackground(haloShape);
        FrameLayout.LayoutParams haloParams = new FrameLayout.LayoutParams(dp(148), dp(148), Gravity.CENTER);
        emblem.addView(halo, haloParams);

        ring = new RingView(context, gold);
        FrameLayout.LayoutParams ringParams = new FrameLayout.LayoutParams(dp(132), dp(132), Gravity.CENTER);
        emblem.addView(ring, ringParams);

        logoCard = new View(context);
        GradientDrawable cardShape = new GradientDrawable();
        cardShape.setColor(cream);
        cardShape.setCornerRadius(dp(30));
        logoCard.setBackground(cardShape);
        logoCard.setElevation(dp(12));
        FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(dp(92), dp(92), Gravity.CENTER);
        emblem.addView(logoCard, cardParams);

        ImageView logo = new ImageView(context);
        logo.setImageResource(R.mipmap.ic_launcher_foreground);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setPadding(dp(11), dp(11), dp(11), dp(11));
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(dp(92), dp(92), Gravity.CENTER);
        emblem.addView(logo, logoParams);

        LinearLayout.LayoutParams emblemLayout = new LinearLayout.LayoutParams(emblemSize, emblemSize);
        content.addView(emblem, emblemLayout);

        TextView brand = new TextView(context);
        brand.setText("GKJW KUCUR");
        brand.setTextColor(cream);
        brand.setTextSize(22);
        brand.setTypeface(android.graphics.Typeface.create("serif", android.graphics.Typeface.BOLD));
        brand.setLetterSpacing(0.16f);
        brand.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams brandLayout = new LinearLayout.LayoutParams(
            LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT
        );
        brandLayout.topMargin = dp(23);
        content.addView(brand, brandLayout);

        TextView tagline = new TextView(context);
        tagline.setText("PATUNGGILAN KANG NYAWIJI");
        tagline.setTextColor(0xC9F3EBDD);
        tagline.setTextSize(10);
        tagline.setLetterSpacing(0.18f);
        tagline.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams taglineLayout = new LinearLayout.LayoutParams(
            LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT
        );
        taglineLayout.topMargin = dp(9);
        content.addView(tagline, taglineLayout);

        progress = new ProgressView(context, gold);
        LinearLayout.LayoutParams progressLayout = new LinearLayout.LayoutParams(dp(142), dp(4));
        progressLayout.topMargin = dp(34);
        content.addView(progress, progressLayout);

        TextView status = new TextView(context);
        status.setText("Menyiapkan ruang GKJW");
        status.setTextColor(0xBFEDE8D9);
        status.setTextSize(12);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusLayout = new LinearLayout.LayoutParams(
            LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT
        );
        statusLayout.topMargin = dp(14);
        content.addView(status, statusLayout);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER
        );
        addView(content, contentParams);

        pulseAnimator = ValueAnimator.ofFloat(0.94f, 1.04f);
        pulseAnimator.setDuration(1900);
        pulseAnimator.setRepeatMode(ValueAnimator.REVERSE);
        pulseAnimator.setRepeatCount(ValueAnimator.INFINITE);
        pulseAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
        pulseAnimator.addUpdateListener(animator -> {
            float scale = (float) animator.getAnimatedValue();
            halo.setScaleX(scale);
            halo.setScaleY(scale);
            halo.setAlpha(0.55f + (scale - 0.94f) * 4f);
            logoCard.setScaleX(0.985f + (scale - 0.94f) * 0.5f);
            logoCard.setScaleY(0.985f + (scale - 0.94f) * 0.5f);
        });

        ringAnimator = ValueAnimator.ofFloat(0f, 360f);
        ringAnimator.setDuration(2400);
        ringAnimator.setRepeatCount(ValueAnimator.INFINITE);
        ringAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
        ringAnimator.addUpdateListener(animator -> ring.setRotationDegrees((float) animator.getAnimatedValue()));

        progressAnimator = ValueAnimator.ofFloat(0f, 1f);
        progressAnimator.setDuration(1450);
        progressAnimator.setRepeatCount(ValueAnimator.INFINITE);
        progressAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
        progressAnimator.addUpdateListener(animator -> progress.setProgress((float) animator.getAnimatedValue()));
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        pulseAnimator.start();
        ringAnimator.start();
        progressAnimator.start();
    }

    @Override
    protected void onDetachedFromWindow() {
        pulseAnimator.cancel();
        ringAnimator.cancel();
        progressAnimator.cancel();
        super.onDetachedFromWindow();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class RingView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF bounds = new RectF();
        private float rotationDegrees;

        RingView(Context context, int color) {
            super(context);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.round(2 * getResources().getDisplayMetrics().density));
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setColor(color);
            paint.setAlpha(230);
        }

        void setRotationDegrees(float value) {
            rotationDegrees = value;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float inset = paint.getStrokeWidth() * 1.5f;
            bounds.set(inset, inset, getWidth() - inset, getHeight() - inset);
            canvas.save();
            canvas.rotate(rotationDegrees, getWidth() / 2f, getHeight() / 2f);
            canvas.drawArc(bounds, 202f, 108f, false, paint);
            paint.setAlpha(90);
            canvas.drawArc(bounds, 325f, 16f, false, paint);
            paint.setAlpha(230);
            canvas.restore();
        }
    }

    private static final class ProgressView extends View {
        private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint segmentPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF track = new RectF();
        private final RectF segment = new RectF();
        private float progress;

        ProgressView(Context context, int color) {
            super(context);
            trackPaint.setColor(0x50F3EBDD);
            segmentPaint.setColor(color);
        }

        void setProgress(float value) {
            progress = value;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float radius = getHeight() / 2f;
            track.set(0, 0, getWidth(), getHeight());
            canvas.drawRoundRect(track, radius, radius, trackPaint);
            float segmentWidth = getWidth() * 0.34f;
            float left = (getWidth() + segmentWidth) * progress - segmentWidth;
            segment.set(left, 0, left + segmentWidth, getHeight());
            canvas.save();
            canvas.clipRect(track);
            canvas.drawRoundRect(segment, radius, radius, segmentPaint);
            canvas.restore();
        }
    }
}

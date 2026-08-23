package com.alivia.salud;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) {
      // Paridad visual con la web: ignorar la escala de fuente del sistema.
      webView.getSettings().setTextZoom(100);
      // Sin glow/stretch de Android en los bordes de scroll (la web no lo tiene).
      webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
  }
}

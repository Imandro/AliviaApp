import SwiftUI
import WebKit

struct WebShellView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()

        // Inyecta el bridge JS↔Swift antes del código de la app
        let controller = config.userContentController
        controller.addUserScript(
            WKUserScript(
                source: BridgeScript.source,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

        let webView = WKWebView(frame: .zero, configuration: config)
        context.coordinator.nativeBridge = NativeBridge(webView: webView)
        controller.add(context.coordinator.nativeBridge!, name: "aliviaBridge")

        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 26/255, green: 42/255, blue: 32/255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        // Load bundled PWA index.html
        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(
                indexURL,
                allowingReadAccessTo: Bundle.main.bundleURL
            )
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(
            forName: "aliviaBridge"
        )
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var nativeBridge: NativeBridge?

        private func isOpeningExternally(_ navigationAction: WKNavigationAction) -> Bool {
            guard let url = navigationAction.request.url else { return false }
            // target="_blank" or window.open → navigation type "other" with non-file URL
            if navigationAction.navigationType == .other,
               url.scheme == "https" || url.scheme == "http" {
                return true
            }
            return false
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if isOpeningExternally(navigationAction),
               let url = navigationAction.request.url {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            // Allow local file navigation
            if let url = navigationAction.request.url, url.scheme == "file" {
                decisionHandler(.allow)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            // Open target="_blank" / window.open in system browser
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}
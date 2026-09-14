import UIKit
import WebKit
import LocalAuthentication

/// Bridge nativo JS↔Swift: biometría, haptics, notificaciones y status bar.
/// Se comunica con el JS inyectado vía window.webkit.messageHandlers.aliviaBridge.
final class NativeBridge: NSObject, WKScriptMessageHandler {

    private weak var webView: WKWebView?
    private var privacyEnabled = false
    private var privacyOverlay: UIView?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(privacyShowOnBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(privacyHideOnForeground),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Privacy overlay (multitasking)

    @objc private func privacyShowOnBackground() {
        guard privacyEnabled else { return }
        DispatchQueue.main.async {
            guard self.privacyOverlay == nil,
                  let window = UIApplication.shared.connectedScenes
                    .compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first else { return }
            let overlay = UIView(frame: window.bounds)
            overlay.backgroundColor = UIColor(red: 26/255, green: 42/255, blue: 32/255, alpha: 1)
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            window.addSubview(overlay)
            window.bringSubviewToFront(overlay)
            self.privacyOverlay = overlay
        }
    }

    @objc private func privacyHideOnForeground() {
        DispatchQueue.main.async {
            self.privacyOverlay?.removeFromSuperview()
            self.privacyOverlay = nil
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(
        _ controller: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let method = body["method"] as? String else { return }
        let args = body["args"] as? [String: Any] ?? [:]

        switch method {
        // ─── Biometric ────────────────────────────────────────────
        case "biometric.isAvailable":
            biometricIsAvailable(id: id)
        case "biometric.verify":
            biometricVerify(id: id, args: args)

        // ─── Haptics ──────────────────────────────────────────────
        case "haptics.impact":
            hapticImpact(id: id, args: args)
        case "haptics.notification":
            hapticNotification(id: id, args: args)

        // ─── Notifications ────────────────────────────────────────
        case "notifications.checkPermissions":
            notificationsCheckPermissions(id: id)
        case "notifications.requestPermissions":
            notificationsRequestPermissions(id: id)
        case "notifications.createChannel":
            // iOS no tiene canales estilo Android: no-op.
            resolve(id: id, result: true)
        case "notifications.schedule":
            notificationsSchedule(id: id, args: args)
        case "notifications.cancel":
            notificationsCancel(id: id, args: args)

        // ─── System Bars ──────────────────────────────────────────
        case "systemBars.setStyle":
            systemBarsSetStyle(id: id, args: args)

        // ─── Privacy Screen ───────────────────────────────────────
        case "privacy.set":
            privacySet(id: id, args: args)

        default:
            reject(id: id, error: "Unknown method: \(method)")
        }
    }

    // MARK: - Resolve / Reject helpers

    private func resolve(id: String, result: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: ["result": result]),
              let json = String(data: data, encoding: .utf8) else {
            reject(id: id, error: "Serialization error")
            return
        }
        let js = "window.AliviaBridge._resolve('\(id)', \(json))"
        webView?.evaluateJavaScript(js)
    }

    private func reject(id: String, error: String) {
        let escaped = error.replacingOccurrences(of: "'", with: "\\'")
        webView?.evaluateJavaScript(
            "window.AliviaBridge._reject('\(id)', '\(escaped)')"
        )
    }

    // MARK: - Biometric

    private func biometricIsAvailable(id: String) {
        let ctx = LAContext()
        var error: NSError?
        let can = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        if can {
            var type = "unknown"
            switch ctx.biometryType {
            case .faceID:       type = "faceID"
            case .touchID:      type = "touchID"
            case .opticID:      type = "opticID"
            @unknown default:   break
            }
            resolve(id: id, result: ["available": true, "biometryType": type])
        } else {
            let msg = error?.localizedDescription ?? "Not available"
            resolve(id: id, result: ["available": false, "biometryType": "", "error": msg])
        }
    }

    private func biometricVerify(id: String, args: [String: Any]) {
        let reason = args["reason"] as? String ?? "Verifica tu identidad"
        let ctx = LAContext()
        ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                           localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    self.resolve(id: id, result: true)
                } else {
                    self.reject(id: id, error: error?.localizedDescription ?? "Cancelled")
                }
            }
        }
    }

    // MARK: - Haptics

    private func hapticImpact(id: String, args: [String: Any]) {
        let style = args["style"] as? String ?? "light"
        let generator: UIImpactFeedbackGenerator
        switch style {
        case "heavy":   generator = UIImpactFeedbackGenerator(style: .heavy)
        case "medium":  generator = UIImpactFeedbackGenerator(style: .medium)
        case "rigid":   generator = UIImpactFeedbackGenerator(style: .rigid)
        case "soft":    generator = UIImpactFeedbackGenerator(style: .soft)
        default:        generator = UIImpactFeedbackGenerator(style: .light)
        }
        generator.impactOccurred()
        resolve(id: id, result: true)
    }

    private func hapticNotification(id: String, args: [String: Any]) {
        let type = args["type"] as? String ?? "success"
        let generator = UINotificationFeedbackGenerator()
        switch type {
        case "error":   generator.notificationOccurred(.error)
        case "warning": generator.notificationOccurred(.warning)
        default:        generator.notificationOccurred(.success)
        }
        resolve(id: id, result: true)
    }

    // MARK: - Local Notifications

    private func notificationsCheckPermissions(id: String) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let granted = settings.authorizationStatus == .authorized
            self.resolve(id: id, result: ["display": granted ? "granted" : "denied"])
        }
    }

    private func notificationsRequestPermissions(id: String) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            self.resolve(id: id, result: ["display": granted ? "granted" : "denied"])
        }
    }

    private func notificationsSchedule(id: String, args: [String: Any]) {
        guard let notifications = args["notifications"] as? [[String: Any]] else {
            reject(id: id, error: "Missing notifications array")
            return
        }
        let center = UNUserNotificationCenter.current()

        for notif in notifications {
            guard let nid = notif["id"] as? Int,
                  let title = notif["title"] as? String else { continue }
            let body = notif["body"] as? String ?? ""

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default

            // Parse schedule
            var trigger: UNNotificationTrigger?
            if let schedule = notif["schedule"] as? [String: Any] {
                if let on = schedule["on"] as? [String: Any] {
                    // Calendar-based trigger
                    var comps = DateComponents()
                    comps.year = on["year"] as? Int
                    comps.month = on["month"] as? Int
                    comps.day = on["day"] as? Int
                    comps.hour = on["hour"] as? Int
                    comps.minute = on["minute"] as? Int
                    let repeats = schedule["repeats"] as? Bool ?? false
                    trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
                }
            }

            // Fallback: immediate trigger (should not happen in normal flow)
            if trigger == nil {
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
            }

            let request = UNNotificationRequest(
                identifier: "alivia-\(nid)",
                content: content,
                trigger: trigger
            )
            center.add(request)
        }
        resolve(id: id, result: true)
    }

    private func notificationsCancel(id: String, args: [String: Any]) {
        guard let notifications = args["notifications"] as? [[String: Any]] else {
            resolve(id: id, result: true)
            return
        }
        let ids = notifications.compactMap { ($0["id"] as? Int).map { "alivia-\($0)" } }
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: ids)
        resolve(id: id, result: true)
    }

    // MARK: - System Bars

    private func systemBarsSetStyle(id: String, args: [String: Any]) {
        let style = args["style"] as? String ?? "dark"
        let theme = args["theme"] as? String ?? "dark"
        DispatchQueue.main.async {
            let isLight = theme == "light"
            if #available(iOS 13.0, *) {
                UIApplication.shared.delegate?.window??.overrideUserInterfaceStyle =
                    isLight ? .light : .dark
            }
            // Fallback deprecated para apps no-SwiftUI
            UIApplication.shared.statusBarStyle = isLight ? .darkContent : .lightContent
        }
        _ = style
        resolve(id: id, result: true)
    }

    // MARK: - Privacy Screen

    private func privacySet(id: String, args: [String: Any]) {
        privacyEnabled = args["enabled"] as? Bool ?? false
        resolve(id: id, result: true)
    }
}

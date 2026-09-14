import SwiftUI

@main
struct AliviaApp: App {
    var body: some Scene {
        WindowGroup {
            WebShellView()
                .ignoresSafeArea(.keyboard)
                .preferredColorScheme(.dark)
        }
    }
}

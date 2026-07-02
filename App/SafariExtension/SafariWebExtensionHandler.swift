import SafariServices

/// Principal class for the bundled Safari Web Extension.
///
/// The extension ships only a content-script stylesheet (`enhance.css`, shared
/// with the Chrome extension and the bookmarklet). It has no background page and
/// no native messaging, so the handler just completes every request immediately.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: [NSExtensionItem()], completionHandler: nil)
    }
}

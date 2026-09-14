import Foundation

/// JS inyectado al inicio del documento (documentStart) que expone
/// `window.AliviaBridge.call(method, args)` como API de promesas hacia Swift.
enum BridgeScript {
    static let source = """
    (function () {
      if (window.AliviaBridge) return;
      window.AliviaBridge = {
        _callbacks: {},
        _nextId: 1,
        call: function (method, args) {
          return new Promise(function (resolve, reject) {
            var id = String(this._nextId++);
            this._callbacks[id] = { resolve: resolve, reject: reject };
            window.webkit.messageHandlers.aliviaBridge.postMessage({
              id: id, method: method, args: args || {}
            });
          }.bind(this));
        },
        _resolve: function (id, payload) {
          var cb = this._callbacks[id];
          if (!cb) return;
          delete this._callbacks[id];
          cb.resolve(payload ? payload.result : undefined);
        },
        _reject: function (id, message) {
          var cb = this._callbacks[id];
          if (!cb) return;
          delete this._callbacks[id];
          cb.reject(new Error(message));
        }
      };
    })();
    """
}
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classPrivateFieldGet4 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _uuid = require("uuid");

var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));

var _lodash = require("lodash");

var _requestAnimationFrame = require("./requestAnimationFrame");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var callListeners = function callListeners(listeners, store, loaders) {
  Object.values(listeners).forEach(function (listener) {
    listener.subscribeCallback(listener.prevState, store, loaders, listener);
  });
};

var containsChange = function containsChange(changes, prevState) {
  for (var _i = 0, _Object$entries = Object.entries(changes); _i < _Object$entries.length; _i++) {
    var change = _Object$entries[_i];

    if (prevState[change[0]] !== change[1]) {
      return true;
    }
  }

  return false;
};

var debouncePerAnimationFrame = function debouncePerAnimationFrame(func, params) {
  // If there's a pending function call, cancel it
  if (func.debounce) {
    (0, _requestAnimationFrame.caf)(func.debounce);
  } // Setup the new function call to run at the next animation frame


  func.debounce = (0, _requestAnimationFrame.raf)(function () {
    func(params);
  });
};

var isOpen = function isOpen(ws) {
  return ws.readyState === ws.OPEN;
};

var isConnecting = function isConnecting(ws) {
  return ws.readyState === ws.CONNECTING;
};

var _messagingManager = new WeakMap();

var SynchemyClient = /*#__PURE__*/function () {
  function SynchemyClient(_ref) {
    var _this = this;

    var host = _ref.host,
        _ref$actions = _ref.actions,
        actions = _ref$actions === void 0 ? {} : _ref$actions;
    (0, _classCallCheck2["default"])(this, SynchemyClient);
    (0, _defineProperty2["default"])(this, "store", {});
    (0, _defineProperty2["default"])(this, "actions", {});
    (0, _defineProperty2["default"])(this, "asyncActions", {});

    _messagingManager.set(this, {
      writable: true,
      value: {
        client: null,
        host: null,
        onMessage: null,
        listeners: {},
        queue: []
      }
    });

    if (!host) {
      throw new Error('You must provide a host to connect to.');
    }

    this.createConnection({
      host: host
    });
    Object.values(actions).forEach(function (action) {
      _this.registerAction(action.name, action.action, action.options);
    });
  }

  (0, _createClass2["default"])(SynchemyClient, [{
    key: "createConnection",
    value: function createConnection(_ref2) {
      var _this2 = this;

      var host = _ref2.host;
      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).host = host;
      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).client = new _isomorphicWs["default"](host);

      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).client.onmessage = function (_ref3) {
        var data = _ref3.data;
        var response = JSON.parse(data);
        var message = response.message,
            messageId = response.messageId;

        if (messageId) {
          var _classPrivateFieldGet2 = (0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).queue.find(function (m) {
            return m.message.messageId === messageId;
          }),
              resolve = _classPrivateFieldGet2.resolve,
              options = _classPrivateFieldGet2.options;

          var updateStore = options.updateStore,
              processResponse = options.processResponse;
          var newResult = processResponse ? processResponse(message) : message;

          if (updateStore !== false) {
            _this2.store = _objectSpread(_objectSpread({}, _this2.store), newResult);
            callListeners((0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).listeners, _this2.store, _this2.asyncActions);
          }

          resolve(newResult);
          (0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).queue = (0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).queue.filter(function (m) {
            return m.message.messageId !== messageId;
          });
        } else {
          if ((0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).onMessage) {
            (0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).onMessage(message);
          } else {
            _this2.store = _objectSpread(_objectSpread({}, _this2.store), message);
            callListeners((0, _classPrivateFieldGet4["default"])(_this2, _messagingManager).listeners, _this2.store, _this2.asyncActions);
          }
        }
      };

      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).client.onclose = function (event) {
        if (event.code !== 1000) {
          // Error code 1000 means that the connection was closed normally.
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            throw new Error('You are offline. Please connect to the Internet and try again.');
          }
        }
      };
    }
  }, {
    key: "subscribe",
    value: function subscribe() {
      var mapStateToProps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (state) {
        return state;
      };
      var callback = arguments.length > 1 ? arguments[1] : undefined;
      var shouldUpdate = arguments.length > 2 ? arguments[2] : undefined;
      var store = this.store;
      var loaders = this.asyncActions;
      var prevState = mapStateToProps(store, loaders);

      var subscribeCallback = function subscribeCallback(prevState, store, loaders, listener) {
        if (listener.shouldUpdate) {
          var _newState = mapStateToProps(store, loaders);

          if (listener.shouldUpdate(prevState, _newState)) {
            listener.prevState = _newState;
            return debouncePerAnimationFrame(callback, _newState);
          }

          return;
        }

        var newState = mapStateToProps(store, loaders);

        if (containsChange(newState, prevState)) {
          listener.prevState = newState;
          return debouncePerAnimationFrame(callback, newState);
        }
      };

      var listener = {
        subscribeCallback: subscribeCallback,
        prevState: prevState,
        shouldUpdate: shouldUpdate
      };
      var listenerId = (0, _uuid.v4)();
      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).listeners[listenerId] = listener;
      debouncePerAnimationFrame(callback, prevState);
      return listenerId;
    }
  }, {
    key: "unsubscribe",
    value: function unsubscribe(listenerId) {
      var _classPrivateFieldGet3 = (0, _classPrivateFieldGet4["default"])(this, _messagingManager).listeners,
          _ = _classPrivateFieldGet3[listenerId],
          otherListeners = (0, _objectWithoutProperties2["default"])(_classPrivateFieldGet3, [listenerId].map(_toPropertyKey));
      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).listeners = otherListeners;
    }
  }, {
    key: "onMessage",
    value: function onMessage(func) {
      (0, _classPrivateFieldGet4["default"])(this, _messagingManager).onMessage = func;
    }
  }, {
    key: "send",
    value: function send(message) {
      var _this3 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return new Promise(function (resolve, reject) {
        var getMessage = function getMessage(message) {
          if (typeof message === 'function') {
            return message(_this3.store);
          }

          return message;
        };

        var newMessage = {
          message: getMessage(message),
          messageId: (0, _uuid.v4)()
        };
        (0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).queue.push({
          message: newMessage,
          resolve: resolve,
          options: options
        });

        if (isOpen((0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).client)) {
          (0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).client.send(JSON.stringify(newMessage));
        } else {
          if (!isConnecting((0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).client)) {
            _this3.createConnection({
              host: (0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).host
            });
          }

          (0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).client.onopen = function () {
            (0, _classPrivateFieldGet4["default"])(_this3, _messagingManager).client.send(JSON.stringify(newMessage));
          };
        }
      });
    }
  }, {
    key: "updateStore",
    value: function updateStore(state) {
      if (typeof state === 'function') {
        var newState = state(this.store);
        this.store = _objectSpread(_objectSpread({}, this.store), newState);
        callListeners((0, _classPrivateFieldGet4["default"])(this, _messagingManager).listeners, this.store, this.asyncActions);
      } else {
        this.store = _objectSpread(_objectSpread({}, this.store), state);
        callListeners((0, _classPrivateFieldGet4["default"])(this, _messagingManager).listeners, this.store, this.asyncActions);
      }
    }
  }, {
    key: "registerAction",
    value: function registerAction(actionName, action) {
      var _this4 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var getAction = function getAction(action, options) {
        if (options.debounce) {
          return (0, _lodash.debounce)(action, options.debounce);
        }

        if (options.throttle) {
          return (0, _lodash.throttle)(action, options.throttle);
        }

        return action;
      };

      var newAction = getAction(action, options);
      var methodName = actionName.split('_').map(function (word, index) {
        if (index === 0) {
          return word.toLowerCase();
        }

        return "".concat(word.substring(0, 1).toUpperCase()).concat(word.substring(1).toLowerCase());
      }).join('');
      this.asyncActions[methodName] = {
        name: actionName,
        loading: false
      };
      this.actions[methodName] = /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var _args = arguments;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _this4.asyncActions[methodName] = _objectSpread(_objectSpread({}, _this4.asyncActions[methodName]), {}, {
                  loading: true
                });
                callListeners((0, _classPrivateFieldGet4["default"])(_this4, _messagingManager).listeners, _this4.store, _this4.asyncActions);
                _context.next = 4;
                return newAction.apply(void 0, _args);

              case 4:
                _this4.asyncActions[methodName] = _objectSpread(_objectSpread({}, _this4.asyncActions[methodName]), {}, {
                  loading: false
                });
                callListeners((0, _classPrivateFieldGet4["default"])(_this4, _messagingManager).listeners, _this4.store, _this4.asyncActions);

              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
    }
  }]);
  return SynchemyClient;
}();

var _default = SynchemyClient;
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=client.js.map
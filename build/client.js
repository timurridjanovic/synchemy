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

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _uuid = require("uuid");

var _lodash = require("lodash");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var messagingManager = {
  client: null,
  host: null,
  listeners: {},
  queue: [],
  asyncActions: {}
};

var callListeners = function callListeners(listeners, changes, store, loaders) {
  Object.values(listeners).forEach(function (listener) {
    listener.subscribeCallback(listener.prevState, changes, store, loaders, listener);
  });
};

var containsChange = function containsChange(changes, prevState) {
  for (var _i = 0, _Object$entries = Object.entries(changes); _i < _Object$entries.length; _i++) {
    var change = _Object$entries[_i];

    if (change[1] !== undefined && prevState[change[0]] !== change[1]) {
      return true;
    }
  }

  return false;
};

var isOpen = function isOpen(ws) {
  return ws.readyState === ws.OPEN;
};

var SynchemyClient = /*#__PURE__*/function () {
  function SynchemyClient() {
    (0, _classCallCheck2["default"])(this, SynchemyClient);
    this.store = {};
    this.actions = {};
    this.asyncActions = {};
  }

  (0, _createClass2["default"])(SynchemyClient, [{
    key: "createConnection",
    value: function createConnection(_ref) {
      var _this = this;

      var host = _ref.host;
      return new Promise(function (resolve, reject) {
        messagingManager.host = host;
        messagingManager.client = new WebSocket(host);

        messagingManager.client.onmessage = function (_ref2) {
          var data = _ref2.data;
          var response = JSON.parse(data);
          var result = response.result,
              messageId = response.messageId;

          var _messagingManager$que = messagingManager.queue.find(function (m) {
            return m.message.messageId === messageId;
          }),
              resolve = _messagingManager$que.resolve,
              options = _messagingManager$que.options;

          var updateStore = options.updateStore,
              processResponse = options.processResponse;
          var newResult = processResponse ? processResponse(result) : result;

          if (updateStore !== false) {
            _this.store = _objectSpread(_objectSpread({}, _this.store), newResult);
            callListeners(messagingManager.listeners, {
              store: newResult,
              loaders: messagingManager.asyncActions
            }, _this.store, _this.asyncActions);
          }

          resolve(newResult);
          messagingManager.queue = messagingManager.queue.filter(function (m) {
            return m.message.messageId !== messageId;
          });
        };

        messagingManager.client.onerror = function (error) {
          console.log('ERROR: ', error);
        };

        messagingManager.client.onclose = function (event) {
          if (event.code !== 1000) {
            // Error code 1000 means that the connection was closed normally.
            if (!navigator.onLine) {
              reject(new Error('You are offline. Please connect to the Internet and try again.'));
            }
          }
        };

        messagingManager.client.onopen = function () {
          resolve();
        };
      });
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

      var debounceRender = function debounceRender(render, mappedProps) {
        // If there's a pending render, cancel it
        if (render.debounce) {
          window.cancelAnimationFrame(render.debounce);
        } // Setup the new render to run at the next animation frame


        render.debounce = window.requestAnimationFrame(function () {
          render(mappedProps);
        });
      };

      var subscribeCallback = function subscribeCallback(prevState, changes, store, loaders, listener) {
        if (listener.shouldUpdate) {
          var newState = mapStateToProps(store, loaders);

          if (listener.shouldUpdate(prevState, newState)) {
            listener.prevState = newState;
            return debounceRender(callback, newState);
          }

          return;
        }

        var newChanges = mapStateToProps(changes.store, changes.loaders);

        if (containsChange(newChanges, prevState)) {
          var _newState = mapStateToProps(store, loaders);

          listener.prevState = _newState;
          return debounceRender(callback, _newState);
        }
      };

      var listener = {
        subscribeCallback: subscribeCallback,
        prevState: prevState,
        shouldUpdate: shouldUpdate
      };
      var listenerId = (0, _uuid.v4)();
      messagingManager.listeners[listenerId] = listener;
      return listenerId;
    }
  }, {
    key: "unsubscribe",
    value: function unsubscribe(listenerId) {
      var _messagingManager$lis = messagingManager.listeners,
          _ = _messagingManager$lis[listenerId],
          otherListeners = (0, _objectWithoutProperties2["default"])(_messagingManager$lis, [listenerId].map(_toPropertyKey));
      messagingManager.listeners = otherListeners;
    }
  }, {
    key: "send",
    value: function send(message) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return new Promise(function (resolve, reject) {
        var getMessage = function getMessage(message) {
          if (typeof message === 'function') {
            return message(_this2.store);
          }

          return message;
        };

        var newMessage = _objectSpread(_objectSpread({}, getMessage(message)), {}, {
          messageId: (0, _uuid.v4)()
        });

        messagingManager.queue.push({
          message: newMessage,
          resolve: resolve,
          options: options
        });

        if (isOpen(messagingManager.client)) {
          messagingManager.client.send(JSON.stringify(newMessage));
        } else {
          _this2.createConnection({
            host: messagingManager.host
          });

          messagingManager.client.onopen = function () {
            messagingManager.client.send(JSON.stringify(newMessage));
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
        callListeners(messagingManager.listeners, {
          store: newState,
          loaders: messagingManager.asyncActions
        }, this.store, this.asyncActions);
      } else {
        this.store = _objectSpread(_objectSpread({}, this.store), state);
        callListeners(messagingManager.listeners, {
          store: state,
          loaders: messagingManager.asyncActions
        }, this.store, this.asyncActions);
      }
    }
  }, {
    key: "registerAction",
    value: function registerAction(actionName, action) {
      var _this3 = this;

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
      messagingManager.asyncActions[methodName] = {};
      this.asyncActions[methodName] = {
        name: actionName,
        loading: false
      };
      this.actions[methodName] = /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var changes,
            newChanges,
            _args = arguments;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _this3.asyncActions[methodName] = _objectSpread(_objectSpread({}, _this3.asyncActions[methodName]), {}, {
                  loading: true
                });
                changes = {
                  store: {},
                  loaders: _objectSpread(_objectSpread({}, messagingManager.asyncActions), {}, (0, _defineProperty2["default"])({}, methodName, {
                    loading: true
                  }))
                };
                callListeners(messagingManager.listeners, changes, _this3.store, _this3.asyncActions);
                _context.next = 5;
                return newAction.apply(void 0, _args);

              case 5:
                _this3.asyncActions[methodName] = _objectSpread(_objectSpread({}, _this3.asyncActions[methodName]), {}, {
                  loading: false
                });
                newChanges = {
                  store: {},
                  loaders: _objectSpread(_objectSpread({}, messagingManager.asyncActions), {}, (0, _defineProperty2["default"])({}, methodName, {
                    loading: false
                  }))
                };
                callListeners(messagingManager.listeners, newChanges, _this3.store, _this3.asyncActions);

              case 8:
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

var synchemy = new SynchemyClient();
var _default = synchemy;
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=client.js.map
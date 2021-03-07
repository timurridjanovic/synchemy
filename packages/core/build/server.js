"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classPrivateFieldGet3 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _ws = _interopRequireDefault(require("ws"));

var _uuid = require("uuid");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _messagingManager = new WeakMap();

var SynchemyServer = /*#__PURE__*/function () {
  function SynchemyServer(_ref) {
    var _this = this;

    var app = _ref.app,
        server = _ref.server,
        _ref$options = _ref.options,
        options = _ref$options === void 0 ? {} : _ref$options;
    (0, _classCallCheck2["default"])(this, SynchemyServer);
    (0, _defineProperty2["default"])(this, "sockets", []);

    _messagingManager.set(this, {
      writable: true,
      value: {
        sockets: {},
        onMessageCallback: null,
        onSocketConnectionCallback: null,
        onSocketDisconnectionCallback: null
      }
    });

    var ws = new _ws["default"].Server(_objectSpread({
      server: server
    }, options));
    server.on('request', app);
    ws.on('connection', function (socket) {
      var socketId = (0, _uuid.v4)();
      (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).sockets[socketId] = socket;

      _this.sockets.push(socketId);

      socket.on('message', function (data) {
        var parsedData = JSON.parse(data);

        if ((0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onMessageCallback) {
          (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onMessageCallback(parsedData, socketId).then(function (_ref2) {
            var message = _ref2.message,
                messageId = _ref2.messageId;
            socket.send(JSON.stringify({
              message: message,
              messageId: messageId
            }));
          });
        }
      });
      socket.on('close', function () {
        if ((0, _classPrivateFieldGet3["default"])(_this, _messagingManager)) {
          var _classPrivateFieldGet2 = (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).sockets,
              _ = _classPrivateFieldGet2[socketId],
              otherSockets = (0, _objectWithoutProperties2["default"])(_classPrivateFieldGet2, [socketId].map(_toPropertyKey));
          (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).sockets = otherSockets;
          _this.sockets = Object.keys(otherSockets);

          if ((0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onSocketDisconnectionCallback) {
            (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onSocketDisconnectionCallback(socketId);
          }
        }
      });

      if ((0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onSocketConnectionCallback) {
        (0, _classPrivateFieldGet3["default"])(_this, _messagingManager).onSocketConnectionCallback(socketId);
      }
    });
  }

  (0, _createClass2["default"])(SynchemyServer, [{
    key: "onSocketConnection",
    value: function onSocketConnection(func) {
      (0, _classPrivateFieldGet3["default"])(this, _messagingManager).onSocketConnectionCallback = func;
    }
  }, {
    key: "onSocketDisconnection",
    value: function onSocketDisconnection(func) {
      (0, _classPrivateFieldGet3["default"])(this, _messagingManager).onSocketDisconnectionCallback = func;
    }
  }, {
    key: "onMessage",
    value: function onMessage(func) {
      (0, _classPrivateFieldGet3["default"])(this, _messagingManager).onMessageCallback = function (data, socketId) {
        return new Promise(function (resolve, reject) {
          var messageId = data.messageId,
              message = data.message;
          var newMessage = func({
            message: message,
            socketId: socketId
          });
          resolve({
            message: newMessage,
            messageId: messageId
          });
        });
      };
    }
  }, {
    key: "send",
    value: function send() {
      var _this2 = this;

      var sockets = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var message = arguments.length > 1 ? arguments[1] : undefined;

      if (!Array.isArray(sockets)) {
        throw new Error('The first param to synchemy.send must be an array of socket ids.');
      }

      sockets.forEach(function (socketId) {
        var socket = (0, _classPrivateFieldGet3["default"])(_this2, _messagingManager).sockets[socketId];

        if (socket && socket.send) {
          socket.send(JSON.stringify({
            message: message
          }));
        } else {
          throw new Error('One of the socketIds you provided is invalid.');
        }
      });
    }
  }, {
    key: "sendAll",
    value: function sendAll(message) {
      Object.values((0, _classPrivateFieldGet3["default"])(this, _messagingManager).sockets).forEach(function (socket) {
        socket.send(JSON.stringify({
          message: message
        }));
      });
    }
  }]);
  return SynchemyServer;
}();

var _default = SynchemyServer;
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=server.js.map
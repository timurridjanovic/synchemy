"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _ws = _interopRequireDefault(require("ws"));

var _uuid = require("uuid");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var sockets = {};
var onEventCallback;

var SynchemyServer = /*#__PURE__*/function () {
  function SynchemyServer() {
    (0, _classCallCheck2["default"])(this, SynchemyServer);
  }

  (0, _createClass2["default"])(SynchemyServer, [{
    key: "createConnection",
    value: function createConnection(_ref) {
      var _this = this;

      var app = _ref.app,
          server = _ref.server,
          _ref$options = _ref.options,
          options = _ref$options === void 0 ? {} : _ref$options;
      var ws = new _ws["default"].Server(_objectSpread({
        server: server
      }, options));
      server.on('request', app);
      ws.on('connection', function (socket) {
        var noop = function noop() {};

        var heartbeat = function heartbeat() {
          _this.isAlive = true;
        };

        var interval = setInterval(function () {
          ws.clients.forEach(function (client) {
            if (client.isAlive === false) {
              return client.terminate();
            }

            client.isAlive = false;
            client.ping(noop);
          });
        }, 30000);
        socket.isAlive = true;
        socket.on('pong', heartbeat);
        var socketId = (0, _uuid.v4)();
        sockets[socketId] = socket;
        socket.on('message', function (data) {
          var message = JSON.parse(data);

          if (onEventCallback) {
            onEventCallback(message).then(function (_ref2) {
              var result = _ref2.result,
                  type = _ref2.type,
                  messageId = _ref2.messageId;
              socket.send(JSON.stringify({
                result: result,
                type: type,
                messageId: messageId
              }));
            });
          }
        });
        socket.on('close', function () {
          clearInterval(interval);
          var _sockets = sockets,
              _ = _sockets[socketId],
              otherSockets = (0, _objectWithoutProperties2["default"])(_sockets, [socketId].map(_toPropertyKey));
          sockets = otherSockets;
        });
      });
    }
  }, {
    key: "onEvent",
    value: function onEvent(func) {
      onEventCallback = function onEventCallback(message) {
        return new Promise(function (resolve, reject) {
          var type = message.type,
              messageId = message.messageId,
              otherProps = (0, _objectWithoutProperties2["default"])(message, ["type", "messageId"]);
          var result = func(_objectSpread({
            type: type
          }, otherProps));
          resolve({
            result: result,
            type: type,
            messageId: messageId
          });
        });
      };
    }
  }]);
  return SynchemyServer;
}();

var synchemy = new SynchemyServer();
var _default = synchemy;
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=server.js.map
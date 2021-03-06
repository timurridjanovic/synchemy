"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = _interopRequireDefault(require("./client"));

var _server = _interopRequireDefault(require("./server"));

var _useStore = _interopRequireDefault(require("./useStore"));

var _default = {
  synchemyClient: _client["default"],
  synchemyServer: _server["default"],
  useStore: _useStore["default"]
};
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=index.js.map
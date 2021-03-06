"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _react = require("react");

var useStore = function useStore(synchemy) {
  return function (mapStateToProps, shouldUpdate) {
    var initialState = (0, _react.useMemo)(function () {
      return mapStateToProps(synchemy.store, synchemy.asyncActions);
    }, []);

    var _useState = (0, _react.useState)(initialState),
        _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
        storeState = _useState2[0],
        setStoreState = _useState2[1];

    (0, _react.useEffect)(function () {
      var subscribeCallback = function subscribeCallback(state) {
        setStoreState(state);
      };

      var listenerId = synchemy.subscribe(mapStateToProps, subscribeCallback, shouldUpdate);
      return function () {
        synchemy.unsubscribe(listenerId);
      };
    }, []);
    return storeState;
  };
};

var _default = useStore;
exports["default"] = _default;
module.exports = exports.default;
//# sourceMappingURL=useStore.js.map
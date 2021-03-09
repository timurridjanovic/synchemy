"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.caf = exports.raf = void 0;

var raf = function () {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame;
  }

  var fps = 60;
  var delay = 1000 / fps;
  var animationStartTime = Date.now();
  var previousCallTime = animationStartTime;
  return function (func) {
    var requestTime = Date.now();
    var timeout = Math.max(0, delay - (requestTime - previousCallTime));
    var timeToCall = requestTime + timeout;
    previousCallTime = timeToCall;
    return setTimeout(function () {
      func(timeToCall - animationStartTime);
    }, timeout);
  };
}();

exports.raf = raf;

var caf = function () {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    return window.cancelAnimationFrame;
  }

  return function (id) {
    clearTimeout(id);
  };
}();

exports.caf = caf;
//# sourceMappingURL=requestAnimationFrame.js.map
'use strict';

var vanillajsDom = require('vanillajs-dom');

var waypoints = [];
var positions = [];
var inViewport = [];

var threshold = 0.15;
var winHeight = 0;
var winOffset = 0;
var prevY = 0;

var resizeInitialized = undefined;
var scrollInitialized = undefined;

var removeFromViewport = function removeFromViewport(position, direction) {

  inViewport = inViewport.filter(function (pos) {
    return !(pos === position);
  });

  if (position.exit) {
    position.exit(position.element, direction, "exit");
  }
};

var isPercent = function isPercent(n) {
  return n === Number(n) && n <= 1 && (n % 1 !== 0 || n === 1);
};

var isInViewport = function isInViewport(pos) {

  return inViewport.indexOf(pos) > -1;
};

var isTooSmall = function isTooSmall(parentEl, element) {

  if (!threshold) {
    return false;
  }

  var diff = parentEl.offsetHeight - element.offsetHeight;

  if (diff < Math.floor(parentEl.offsetHeight * threshold)) {
    return true;
  }
};

var goingUp = function goingUp(pos, range) {

  if (range.top >= pos.parentTop && range.top <= pos.stopBottom) {

    if (pos.enter) {
      pos.enter(pos.element, "up", "enter");
    }

    inViewport.push(pos);
  }
};

var goingDown = function goingDown(pos, range) {

  if (range.top >= pos.parentTop && range.top <= pos.stopBottom) {

    if (pos.enter) {
      pos.enter(pos.element, "down", "enter");
    }

    inViewport.push(pos);
  }
};

var getDirection = function getDirection() {

  var y = vanillajsDom.scrollTop();

  var direction = undefined;

  if (y < prevY) {
    direction = "up";
  } else {
    direction = "down";
  }

  prevY = y;

  return direction;
};

var fireInRangeCallbacks = function fireInRangeCallbacks() {

  var direction = getDirection();

  var range = {
    top: Math.max(vanillajsDom.scrollTop() + winOffset, 0),
    bottom: Math.max(vanillajsDom.scrollTop(), 0) + winHeight
  };

  var evalRange = function evalRange(pos) {

    if (pos.isTooSmall) {

      if (isInViewport(pos)) {
        removeFromViewport(pos, "tooSmall");
      }

      return;
    }

    if (isInViewport(pos)) {

      if (direction === "down" && range.top > pos.stopBottom) {
        removeFromViewport(pos, direction);
      }

      if (direction === "up" && range.top < pos.parentTop) {
        removeFromViewport(pos, direction);
      }
    } else {

      if (direction === "down" && range.top >= pos.parentTop) {
        goingDown(pos, range);
      }

      if (direction === "up" && range.top <= pos.stopBottom) {
        goingUp(pos, range);
      }
    }
  };

  positions.forEach(evalRange);
};

var calcPositions = function calcPositions() {

  positions = waypoints.map(function (wp) {

    var parentOffset = wp.parentOffset();

    var parentPos = {
      parentTop: parentOffset.top,
      parentBottom: parentOffset.bottom,
      stopBottom: parentOffset.bottom - vanillajsDom.outerHeight(wp.element),
      isTooSmall: parentOffset.isTooSmall
    };

    return Object.assign(wp, parentPos);
  });

  winHeight = window.innerHeight;
};

var calcWithPadding = function calcWithPadding(val, height, padding) {

  var padded = val + vanillajsDom.scrollTop();

  if (padding && isPercent(padding)) {
    padded -= Math.floor(height * padding);
  } else {
    padded -= padding;
  }

  return padded;
};

var getParentOffset = function getParentOffset(element, padding) {

  var parentEl = vanillajsDom.parent(element, "[data-railway]");
  var paddingTop = padding.top || 0;
  var paddingBottom = padding.bottom || 0;

  return function () {

    var rect = { top: 0 };

    if (!parentEl || !parentEl.ownerDocument) {
      return rect;
    }

    if (parentEl.getBoundingClientRect) {
      rect = parentEl.getBoundingClientRect();
    }

    var height = vanillajsDom.outerHeight(parentEl);
    var top = calcWithPadding(rect.top, height, paddingTop);
    var bottom = calcWithPadding(rect.bottom, height, paddingBottom);

    return { top: top, bottom: bottom, isTooSmall: isTooSmall(parentEl, element) };
  };
};

var resampleTimeout = undefined;

var resample = function resample() {

  var limit = 2000;
  var time = 10;

  var doResample = function doResample() {
    calcPositions();
    fireInRangeCallbacks();

    if (time < limit) {
      time *= 2;
      resampleTimeout = setTimeout(doResample, time);
    }
  };

  if (resampleTimeout) {
    clearTimeout(resampleTimeout);
  }

  resampleTimeout = setTimeout(doResample, time);
};

var onScroll = fireInRangeCallbacks;
var onResize = resample;

var cleanup = function cleanup(waypoint) {

  return function () {

    waypoints = waypoints.filter(function (wp) {
      return !(waypoint === wp);
    });

    if (!waypoints.length) {

      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      resizeInitialized = false;
      scrollInitialized = false;
      if (resampleTimeout) {
        clearTimeout(resampleTimeout);
      }
      calcPositions();
    } else {

      resample();
    }
  };
};

var binding = function binding(ko) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  ko = ko || window.ko;
  winOffset = options.winOffset || winHeight;
  threshold = options.threshold || threshold;

  var createWaypoint = function createWaypoint(element, valueAccessor) {

    var waypoint = { element: element };
    var value = {};

    if (valueAccessor) {
      value = ko.unwrap(valueAccessor());
    }

    if (value instanceof Function) {

      waypoint.enter = value;
      waypoint.exit = value;
    } else {

      if (value.enter instanceof Function) {
        waypoint.enter = value.enter;
      }

      if (value.exit instanceof Function) {
        waypoint.exit = value.exit;
      }
    }

    waypoint.parentOffset = getParentOffset(element, {
      top: value.paddingTop,
      bottom: value.paddingBottom
    });

    return waypoint;
  };

  var init = function init(element, valueAccessor) {

    var waypoint = createWaypoint(element, valueAccessor);

    if (!waypoint.enter && !waypoint.exit) {
      return;
    }

    waypoints.push(waypoint);

    if (!resizeInitialized) {
      window.addEventListener("resize", onResize);
      resizeInitialized = true;
    }

    if (!scrollInitialized) {
      window.addEventListener("scroll", onScroll);
      scrollInitialized = true;
    }

    resample();

    ko.utils.domNodeDisposal.addDisposeCallback(element, cleanup(waypoint));
  };

  return { init: init };
};

module.exports = binding;
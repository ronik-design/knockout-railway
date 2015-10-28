'use strict';

var $inject_Object_assign = Object.assign || function (target) {
  for (var _len = arguments.length, sources = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sources[_key - 1] = arguments[_key];
  }

  sources.forEach(function (source) {
    Object.keys(source).forEach(function (key) {
      return target[key] = source[key];
    });
  });

  return target;
};

var outerHeight = function outerHeight(el) {

  var style = getComputedStyle(el);

  var height = el.offsetHeight;
  height += parseInt(style.marginTop) + parseInt(style.marginBottom);

  return height;
};

var acceptNode = function acceptNode(selector) {

  var firstChar = selector ? selector.charAt(0) : "";

  return function (node) {
    if (selector) {

      // If selector is a class
      if (firstChar === ".") {
        if (node.classList.contains(selector.substr(1))) {
          return NodeFilter.FILTER_ACCEPT;
        }
      }

      // If selector is an ID
      if (firstChar === "#") {
        if (node.id === selector.substr(1)) {
          return NodeFilter.FILTER_ACCEPT;
        }
      }

      // If selector is a data attribute
      if (firstChar === "[") {
        if (node.hasAttribute(selector.substr(1, selector.length - 2))) {
          return NodeFilter.FILTER_ACCEPT;
        }

        // If selector is a tag
        if (node.tagName.toLowerCase() === selector) {
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    } else {

      return NodeFilter.FILTER_ACCEPT;
    }
  };
};

var walkTree = function walkTree(element, selector, direction) {
  var limit = arguments.length <= 3 || arguments[3] === undefined ? -1 : arguments[3];

  var treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, acceptNode(selector), false);

  treeWalker.currentNode = element;

  var nodes = [];

  if (direction === "up") {
    while (treeWalker.parentNode() && (nodes.length < limit || limit === -1)) {
      nodes.push(treeWalker.currentNode);
    }
  } else {
    while (treeWalker.childNode() && (nodes.length < limit || limit === -1)) {
      nodes.push(treeWalker.currentNode);
    }
  }

  return nodes;
};

var getParent = function getParent(element, selector) {

  var nodes = walkTree(element, selector, "up", 1);
  return nodes[0];
};

var scrollTop = function scrollTop() {
  return window.scrollY || window.pageYOffset;
};

var waypoints = [];
var positions = [];
var inViewport = [];

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

var isInViewport = function isInViewport(pos) {

  return inViewport.indexOf(pos) > -1;
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

  var y = scrollTop();

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
    top: Math.max(scrollTop() + winOffset, 0),
    bottom: Math.max(scrollTop(), 0) + winHeight
  };

  var evalRange = function evalRange(pos) {

    if (isInViewport(pos)) {

      if (direction === "down" && range.top >= pos.stopBottom) {
        removeFromViewport(pos, direction);
      }

      if (direction === "up" && range.top <= pos.parentTop) {
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
    var parentTop = parentOffset.top;
    var parentBottom = parentOffset.bottom;
    var stopBottom = parentOffset.bottom - outerHeight(wp.element);

    return $inject_Object_assign(wp, { parentTop: parentTop, parentBottom: parentBottom, stopBottom: stopBottom });
  });

  winHeight = window.innerHeight;
};

var getParentOffset = function getParentOffset(element, padding) {

  var parentEl = getParent(element, "[data-railway]");

  var paddingTop = padding.top || 0;
  var paddingTopPercentage = false;

  var paddingBottom = padding.bottom || 0;
  var paddingBottomPercentage = false;

  if (paddingTop && paddingTop.search && paddingTop.search("%") > -1) {
    paddingTop = parseInt(paddingTop.replace("%", ""), 10) / 100;
    paddingTopPercentage = true;
  }

  if (paddingBottom && paddingBottom.search && paddingBottom.search("%") > -1) {
    paddingBottom = parseInt(paddingBottom.replace("%", ""), 10) / 100;
    paddingBottomPercentage = true;
  }

  return function () {

    if (!parentEl || !parentEl.ownerDocument) {
      return null;
    }

    var rect = { top: 0 };

    if (parentEl.getBoundingClientRect) {
      rect = parentEl.getBoundingClientRect();
    }

    var height = outerHeight(parentEl);

    var top = rect.top + scrollTop();
    var bottom = rect.bottom + scrollTop();

    if (paddingTopPercentage) {
      top += Math.floor(height * paddingTop);
    } else {
      top += paddingTop;
    }

    if (paddingBottomPercentage) {
      bottom += Math.floor(height * paddingBottom);
    } else {
      bottom += paddingBottom;
    }

    return { top: top, bottom: bottom };
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
  winOffset = options.winOffset || 0;

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
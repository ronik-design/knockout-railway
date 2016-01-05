import { outerHeight, parent, scrollTop } from "vanillajs-dom";

let waypoints = [];
let positions = [];
let inViewport = [];

let threshold = 0.15;
let winHeight = 0;
let winOffset = 0;
let prevY = 0;

let resizeInitialized;
let scrollInitialized;

const removeFromViewport = function (position, direction) {

  inViewport = inViewport.filter((pos) => !(pos === position));

  if (position.exit) {
    position.exit(position.element, direction, "exit");
  }
};

const isPercent = function (n) {
  return n === Number(n) && n <= 1 && (n % 1 !== 0 || n === 1);
};

const isInViewport = function (pos) {

  return inViewport.indexOf(pos) > -1;
};

const isTooSmall = function (parentEl, element) {

  if (!threshold) {
    return false;
  }

  const diff = parentEl.offsetHeight - element.offsetHeight;

  if (diff < Math.floor(parentEl.offsetHeight * threshold)) {
    return true;
  }
};

const goingUp = function (pos, range) {

  if (range.top >= pos.parentTop && range.top <= pos.stopBottom) {

    if (pos.enter) {
      pos.enter(pos.element, "up", "enter");
    }

    inViewport.push(pos);
  }
};

const goingDown = function (pos, range) {

  if (range.top >= pos.parentTop && range.top <= pos.stopBottom) {

    if (pos.enter) {
      pos.enter(pos.element, "down", "enter");
    }

    inViewport.push(pos);
  }
};

const getDirection = function () {

  const y = scrollTop();

  let direction;

  if (y < prevY) {
    direction = "up";
  } else {
    direction = "down";
  }

  prevY = y;

  return direction;
};

const fireInRangeCallbacks = function () {

  const direction = getDirection();

  const range = {
    top: Math.max(scrollTop() + winOffset, 0),
    bottom: Math.max(scrollTop(), 0) + winHeight
  };

  const evalRange = function (pos) {

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

const calcPositions = function () {

  positions = waypoints.map((wp) => {

    const parentOffset = wp.parentOffset();
    const parentTop = parentOffset.top;
    const parentBottom = parentOffset.bottom;
    const stopBottom = parentOffset.bottom - outerHeight(wp.element);

    return Object.assign(wp, { parentTop, parentBottom, stopBottom });
  });

  winHeight = window.innerHeight;
};

const calcWithPadding = function (val, height, padding) {

  let padded = val + scrollTop();

  if (padding && isPercent(padding)) {
    padded -= Math.floor(height * padding);
  } else {
    padded -= padding;
  }

  return padded;
};

const getParentOffset = function (element, padding) {

  const parentEl = parent(element, "[data-railway]");
  const paddingTop = padding.top || 0;
  const paddingBottom = padding.bottom || 0;

  return function () {

    let rect = { top: 0 };

    if (!parentEl || !parentEl.ownerDocument) {
      return rect;
    }

    if (parentEl.getBoundingClientRect) {
      rect = parentEl.getBoundingClientRect();
    }

    const height = outerHeight(parentEl);
    const top = calcWithPadding(rect.top, height, paddingTop);
    const bottom = calcWithPadding(rect.bottom, height, paddingBottom);

    return { top, bottom, isTooSmall: isTooSmall(parentEl, element) };
  };
};

let resampleTimeout;

const resample = function () {

  const limit = 2000;
  let time = 10;

  const doResample = () => {
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

const onScroll = fireInRangeCallbacks;
const onResize = resample;

const cleanup = function (waypoint) {

  return function () {

    waypoints = waypoints.filter((wp) => !(waypoint === wp));

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

const binding = function (ko, options = {}) {

  ko = ko || window.ko;
  winOffset = options.winOffset || winHeight;
  threshold = options.threshold || threshold;

  const createWaypoint = function (element, valueAccessor) {

    const waypoint = { element };
    let value = {};

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

  const init = function (element, valueAccessor) {

    const waypoint = createWaypoint(element, valueAccessor);

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

  return { init };
};

export default binding;

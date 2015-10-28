import { outerHeight, parent, scrollTop } from "vanillajs-dom";

let waypoints = [];
let positions = [];
let inViewport = [];

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

const isInViewport = function (pos) {

  return inViewport.indexOf(pos) > -1;
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

const getParentOffset = function (element, padding) {

  const parentEl = parent(element, "[data-railway]");

  let paddingTop = padding.top || 0;
  let paddingTopPercentage = false;

  let paddingBottom = padding.bottom || 0;
  let paddingBottomPercentage = false;

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

    let rect = { top: 0 };

    if (parentEl.getBoundingClientRect) {
      rect = parentEl.getBoundingClientRect();
    }

    const height = outerHeight(parentEl);

    let top = rect.top + scrollTop();
    let bottom = rect.bottom + scrollTop();

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

    return { top, bottom };
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
  winOffset = options.winOffset || 0;

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

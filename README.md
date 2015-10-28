# knockout-railway
Railway calls a handler for an element when the parent "railway" element hits certain points in the viewport. An "enter" event is emitted when the top of the screen (with optional `winOffset`) equals or moves past the top edge of the railway, and an "exit" event when the bottom of the railway moves above the bottom of the view.

Perhaps it's easier to discuss a use-case. Suppose you have a sidebar that you want to stick and follow you down the page, until a certain point, such as when you hit the footer. This will help you do that, by applying inline styles and classes in your railway handler.

# Usage
```html
<div class="parent" data-railway>
  <div data-bind="railway: onRailway"></div>
</div>
```

```js
function onRailway(element, direction, event) {
  if (event === "enter") {
    // do this
  }

  if (event === "exit") {
    // do that
  }
}
```

# Installation

This is how I use it with a Webpack bundled project. Your set-up may be different.

```sh
$ npm install knockout-railway --save-dev
```

```js
import ko from "knockout";
import railway from "knockout-railway";

ko.bindingHandlers.railway = railway(ko);
```

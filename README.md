# DragOrder
A javascript class for managing the order of elements via drag and drop

Inspired by https://archive.codeplex.com/?p=dragsort, this javascript class has no dependencies and is importable via npm.

## FAQ
#### What about the Drag and Drop API?
Unfortunately, the Drag and Drop API quite limited in what it can do when trying to customize things like the placeholder and the dragging element. This class uses mouse events to mimic similar behavior.

## Usage

    npm install dragorder

```javascript
import DragOrder from 'dragorder';

new DragOrder({
    el: document.getElementById('example')
})
```


## Options
| Option | Type | Description | Default |
|--------|------|-------------|---------|
|`el`| Element | The element that contains the items | `required` |
|`drop`| Function | Callback when element is dropped and items are reordered | `items => {}` |
|`dragStart`| Function | Callback when element drag is initiated | `items => {}` |
|`dragEnd`| Function | Callback when element drag is ended. This is always called, even if drag is canceled (i.e. escape key) | `items => {}` |
|`placeholder`| HTML or Element or Function | What to render as a placeholder for dragged item | `item => item.cloneNode(true)` |
|`dragholder`| Function | What to render as the element that is dragged by the mouse | `item => item.cloneNode(true)` |
|`handleSelector`| String | Selector to scope what element is clickable to initiate drag | `item` |
|`itemSelector`|String| Selector to scope what elements are draggable | `this.el.children` |


## Development
### Demo
Load demo.html in browser
### Release
    npm publish
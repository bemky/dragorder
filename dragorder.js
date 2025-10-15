export default class DragOrder {
  
    /*
    Due to limitations with the Drag and Drop API of javascript,
    this uses mouseover to manage the dragging and placement of an item
    */
    options = {
        dragStart: (items) => {},
        dragEnter: (items) => {},
        dragMove: (item) => {},
        drop: (items, item) => {},
        dragEnd: (items) => {},
        dragLeave: (items) => {},
        placeholder: function (item) {
            const el = this.constructor.cloneNode(item);
            el.style.display = item.style.display;
            el.style.opacity = 0.5
            return el
        },
        dragholder: function (item) {
            const el = this.constructor.cloneNode(item);
            el.style.display = item.style.display;
            el.style.width = item.offsetWidth + "px";
            el.style.height = item.offsetHeight + "px";
            el.style.minWidth = 'auto';
            el.style.maxWidth = 'auto';
            el.style.minHeight = 'auto';
            el.style.maxHeight = 'auto';
            el.style.position = 'fixed';
            el.style.zIndex = 999;
            el.style.cursor = "grabbing";
            
            if (this.options.handleSelector) {
                el.querySelector(this.options.handleSelector).style.cursor = "grabbing";
            }
        
            // Fix bug with table rows squishing width
            if (el.tagName == "TR") {
                Array.from(el.children).forEach((child, index) => {
                    child.style.width = item.children[index].offsetWidth + "px"
                })
            }
            return el
        },
        handleSelector: false,
        itemSelector: false,
        parentSelector: false,
        foreignDropSelector: false,
        enabled: true
    }
    
    static cloneNode (node) {
        return node.cloneNode(true)
    }
  
    constructor(options){
        this.el = options.el
        this.el.dragorder = this
    
        Object.keys(this.options).forEach(key => {
            if (options.hasOwnProperty(key)) this.options[key] = options[key]
        })
    
        this.checkCancel = this.checkCancel.bind(this)
        this.mouseMove = this.mouseMove.bind(this)
        this.mouseDown = this.mouseDown.bind(this)
        this.mouseUp = this.mouseUp.bind(this)
        if (this.options.enabled) this.enable()
    }
    
    disable () {
        this.el.removeEventListener('pointerdown', this.mouseDown);
    }
    
    enable () {
        this.el.addEventListener('pointerdown', this.mouseDown);
    }
  
    remove () {
        this.disable()
        this.dragLeave()
    }
  
    checkCancel (e) {
        if(e.key == "Escape" && this.selectedItem !== undefined) {
            this.dragCancel();
        }
    }
  
    mouseDown (e) {
        e.target.setPointerCapture(e.pointerId)
        if (this.options.handleSelector) {
            const matchingEl = e.target.matches(this.options.handleSelector) || e.target.closest(this.options.handleSelector)
            if (!matchingEl) { 
                return
            }
        }
        e.preventDefault()
        this.dragStart(e);
        return false
    }

    mouseMove (e) {
        if (this.moving) return // debounce multiple async calls
        this.moving = true
        this.dragItem.style.left = e.x + "px"
        this.dragItem.style.top = e.y + "px"
      
        const hoveredItem = this.getItem(e.x, e.y)
        if (hoveredItem && this.lastPosition && hoveredItem != this.placeholderItem) {
            const position = this.lastPosition.y > e.y || this.lastPosition.x > e.x ? 'beforebegin' : 'afterend';
            hoveredItem.insertAdjacentElement(position, this.placeholderItem);
            this.options.dragMove(this.placeholderItem)
        } else if (!hoveredItem) {
            const container = this.getContainer(e.x, e.y)
            if (container) {
                let foreignDragOrder
                if (this.options.foreignDropSelector) {
                    foreignDragOrder = container.closest(this.options.foreignDropSelector)
                }
                // Transfer to foreign DragOrder
                if (foreignDragOrder && foreignDragOrder != this.el) {
                    this.placeholderItem.remove()
                    foreignDragOrder.dragorder.dragEnter(this.selectedItem, this.dragItem, this.placeholderItem)
                    this.dragLeave()
                } else if (this.el.contains(container)) {
                    container.append(this.placeholderItem)
                    this.options.dragMove(this.placeholderItem)
                }
            }
        }
    
        this.lastPosition = e
    
        this.moving = false;
    }
  
    mouseUp (e) {
        if (this.dragging) this.drop();
    }
    
    dragEnter (selectedItem, dragItem, placeholderItem) {
        if (this.dragging) return
        this.dragging = true;
        this.getItems()
        this.selectedItem = selectedItem
        this.dragItem = dragItem
        this.placeholderItem = placeholderItem
        
        this.el.append(this.dragItem)
        
        this.options.dragEnter();
        window.addEventListener('pointermove', this.mouseMove);
        window.addEventListener('pointerup', this.mouseUp);
        window.addEventListener('keyup', this.checkCancel);
    }
    
    dragLeave () {
        window.removeEventListener('pointermove', this.mouseMove);
        window.removeEventListener('pointerup', this.mouseUp);
        window.removeEventListener('keyup', this.checkCancel);

        delete this.lastPosition;
        delete this.placeholderItem;
        delete this.dragItem;
        delete this.selectedItem;
        
        this.options.dragLeave();
        this.dragging = false;
    }
  
    dragStart (e) {
        const selectedItem = this.getItem(e.x, e.y);
        const itemPosition = getBoundingClientRect(selectedItem);
        this.lastPosition = e

        // Render dragItem
        const dragItem = this.options.dragholder.call(this, selectedItem);
        dragItem.style.left = e.x + "px"
        dragItem.style.top = e.y + "px"
        dragItem.style.marginTop = itemPosition.top - e.y + "px"
        dragItem.style.marginLeft = itemPosition.left - e.x + "px"


        // Render placeholder
        let placeholderItem
        if (typeof this.options.placeholder == 'string') {
            placeholderItem = document.createElement('div');
            placeholderItem.innerHTML = this.options.placeholder;
            placeholderItem = placeholderItem.children[0];
        } else if (this.options.placeholder instanceof Element) {
            placeholderItem = this.options.placeholder
        } else if (typeof this.options.placeholder == "function") {
            placeholderItem = this.options.placeholder.call(this, selectedItem)
        }
        selectedItem.replaceWith(placeholderItem)


        selectedItem.origin = document.createTextNode("")
        placeholderItem.parentElement.insertBefore(selectedItem.origin, placeholderItem)
        selectedItem.dragEnd = () => {
            selectedItem.origin.remove()
            delete selectedItem.origin
            delete selectedItem.dragEnd
            e.target.releasePointerCapture(e.pointerId)
        }

        this.dragEnter(selectedItem, dragItem, placeholderItem)
        this.options.dragStart(this.items, selectedItem);
        // Needs to be after whatever happens in this.options.dragStart (in case dom changes)
        this.el.setPointerCapture(e.pointerId)
    }
    
    dragCancel () {
        this.selectedItem.origin.replaceWith(this.selectedItem)
        this.dragEnd()
    }
  
    drop () {
        const item = this.selectedItem
        this.placeholderItem.replaceWith(this.selectedItem)
        this.dragEnd();
        this.options.drop(this.getItems(), item);
    }
    
    dragEnd () {
        const selectedItem = this.selectedItem
        this.dragItem.remove()
        this.dragLeave()
        this.options.dragEnd(this.items, selectedItem)
        selectedItem.dragEnd()
    }
  
    getItem(x, y) {
        const elements = this.el.getRootNode().elementsFromPoint(x, y).reverse().filter(el => el != this.dragItem)
        let item = elements.find(el => this.options.itemSelector ? el.matches(this.options.itemSelector) : el.parentElement == this.el)
        if (item && !this.el.contains(item)) {
            if (this.options.foreignDropSelector == false || !item.closest(this.options.foreignDropSelector)) {
                item = undefined
            }
        }
        
        return item 
    }
  
    getItems() {
        this.items = this.options.itemSelector ? this.el.querySelectorAll(this.options.itemSelector) : Array.from(this.el.children)
        return this.items
    }
    
    getContainer (x, y) {
        const elements = this.el.getRootNode().elementsFromPoint(x, y).reverse()
        return this.options.parentSelector ? elements.find(el => el.matches(this.options.parentSelector)) : this.el
    }
 
}

// Helper function for dealing with elements that where display=contents
function getBoundingClientRect(...els) {
    if (Array.isArray(els[0]) && els.length == 1) {
        els = els[0];
    }
  
    if (getComputedStyle(els[0]).display == "contents") {
        return getBoundingClientRect(...Array.from(els[0].children))
    }

    let rect = els[0].getBoundingClientRect();
    rect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
    };
    els.slice(1).forEach(el => {
        const thisRect = el.getBoundingClientRect();
        if (thisRect.left < rect.left) rect.left = thisRect.left;
        if (thisRect.top < rect.top) rect.top = thisRect.top;
        if (thisRect.bottom > rect.bottom) rect.bottom = thisRect.bottom;
        if (thisRect.right > rect.right) rect.right = thisRect.right;
    });
    return new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
}
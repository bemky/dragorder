export default class DragOrder {
  
    /*
    Due to limitations with the Drag and Drop API of javascript,
    this uses mouseover to manage the dragging and placement of an item
    */
    options = {
        drop: (items) => {},
        dragStart: (items) => {},
        dragEnd: (items) => {},
        dragMove: (item) => {},
        placeholder: (item) => {
            const el = item.cloneNode(true);
            el.style.display = item.style.display;
            el.style.opacity = 0.5
            return el
        },
        dragholder: item => {
            const el = item.cloneNode(true);
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
        parentSelector: false
    }
  
    constructor(options){
        this.el = options.el
    
        Object.keys(this.options).forEach(key => {
            if(options[key]) this.options[key] = options[key]
        })
    
        this.keyUp = this.keyUp.bind(this)
        this.mouseMove = this.mouseMove.bind(this)
        this.mouseDown = this.mouseDown.bind(this)
        this.mouseUp = this.mouseUp.bind(this)
        this.el.addEventListener('mousedown', this.mouseDown);
        this.el.addEventListener('mouseup', this.mouseUp);
    }
  
    remove () {
        this.el.removeEventListener('mousedown', this.mouseDown);
        this.el.removeEventListener('mouseup', this.mouseUp);
        this.dragEnd()
    }
  
    keyUp (e) {
        if(e.key == "Escape" && this.selectedItem !== undefined) {
            this.dragEnd();
        }
    }
  
    mouseUp (e) {
        if(this.dragging) this.drop();
    }
  
    mouseDown (e) {
        if(this.options.handleSelector) {
            const matchingEl = e.target.matches(this.options.handleSelector) || e.target.closest(this.options.handleSelector)
            if(!matchingEl) { 
                return
            }
        }
        this.dragStart(e);
    }

    mouseMove (e) {
        if (this.moving) return // debounce multiple async calls
        this.moving = true
        this.dragItem.style.left = e.pageX + "px"
        this.dragItem.style.top = e.pageY + "px"
      
        const hoveredItem = this.getItem(e.pageX, e.pageY)
        if (hoveredItem && this.lastPosition && hoveredItem != this.placeholder) {
            const position = this.lastPosition.y > e.pageY || this.lastPosition.x > e.pageX ? 'beforebegin' : 'afterend';
            hoveredItem.insertAdjacentElement(position, this.placeholder);
            this.options.dragMove(this.placeholder)
        } else if (!hoveredItem) {
            const container = this.getContainer(e.pageX, e.pageY)
            if (container) {
                container.append(this.placeholder)
                this.options.dragMove(this.placeholder)
            }
        }
    
        this.lastPosition = {
            x: e.pageX,
            y: e.pageY
        }
    
        this.moving = false;
    }
  
    dragStart (e) {
        if (this.dragging) return
        this.dragging = true;
        this.getItems()
        this.selectedItem = this.getItem(e.pageX, e.pageY);
        const itemPosition = getBoundingClientRect(this.selectedItem);
        this.lastPosition = {
            x: e.pageX,
            y: e.pageY
        }
	
        // Render dragItem
        this.dragItem = this.options.dragholder.call(this, this.selectedItem);
        this.selectedItem.insertAdjacentElement('beforebegin', this.dragItem);
        this.dragItem.style.left = e.pageX + "px"
        this.dragItem.style.top = e.pageY + "px"
        this.dragItem.style.marginTop = itemPosition.top - e.pageY + "px"
        this.dragItem.style.marginLeft = itemPosition.left - e.pageX + "px"
    
        // Render placeholder
        if (typeof this.options.placeholder == 'string') {
            this.placeholder = document.createElement('div');
            this.placeholder.innerHTML = this.options.placeholder;
            this.placeholder = this.placeholder.children[0];
        } else if (this.options.placeholder instanceof Element) {
            this.placeholder = this.options.placeholder
        } else if (typeof this.options.placeholder == "function") {
            this.placeholder = this.options.placeholder(this.selectedItem)
        }
        this.selectedItem.insertAdjacentElement('beforebegin', this.placeholder)
	
        // Hide selectedItem
        this.selectedItem.styleWas = {display: this.selectedItem.style.display};
        this.selectedItem.style.display = 'none';
    
        window.addEventListener('mousemove', this.mouseMove);
        window.addEventListener('keyup', this.keyUp);
    
        this.options.dragStart(this.items, this.selectedItem);
    }
  
    dragEnd () {
        if(!this.dragging) return;
        Object.keys(this.selectedItem.styleWas).forEach(style => {
            this.selectedItem.style[style] = this.selectedItem.styleWas[style]
        })
        this.dragItem.parentNode.removeChild(this.dragItem);
        this.placeholder.parentNode.removeChild(this.placeholder);
        
        const selectedItem = this.selectedItem
        delete this.lastPosition;
        delete this.placeholder;
        delete this.dragItem;
        delete this.selectedItem;
    
        window.removeEventListener('mousemove', this.mouseMove);
        window.removeEventListener('keyup', this.keyUp);
    
        this.options.dragEnd(this.items, selectedItem);
    
        this.dragging = false;
    }
  
    drop () {
        this.placeholder.insertAdjacentElement('beforebegin', this.selectedItem);
        this.dragEnd();
        this.options.drop(this.getItems());
    }
  
    getItem(x, y) {
        const elements = this.el.getRootNode().elementsFromPoint(x, y).reverse().filter(x => x != this.dragItem)
        return elements.find(el => this.options.itemSelector ? el.matches(this.options.itemSelector) : el.parentElement == this.el)
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
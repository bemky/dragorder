export default class DragOrder {
  
    /*
    Due to limitations with the Drag and Drop API of javascript,
    this uses mouseover to manage the dragging and placement of an item
    */
    options = {
        drop: (items) => {},
        dragStart: (items) => {},
        dragEnd: (items) => {},
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
            el.style.cursor = "grabbing";
        
            // Fix bug with table rows squishing width
            if (el.tagName == "TR") {
                Array.from(el.children).forEach((child, index) => {
                    child.style.width = item.children[index].offsetWidth + "px"
                })
            }
            return el
        },
        handleSelector: false,
        itemSelector: false
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
        if(this.moving) return // debounce multiple async calls
            this.moving = true
            this.dragItem.style.left = e.pageX + "px"
            this.dragItem.style.top = e.pageY + "px"
      
            const hoveredItem = this.getItem(e.pageX, e.pageY)
        if(hoveredItem && this.lastPosition) {
            const position = this.lastPosition.y > e.pageY || this.lastPosition.x > e.pageX ? 'beforebegin' : 'afterend';
            hoveredItem.insertAdjacentElement(position, this.placeholder);
        }
    
        this.lastPosition = {
            x: e.pageX,
            y: e.pageY
        }
    
        this.moving = false;
    }
  
    dragStart (e) {
        if(this.dragging) return
            this.dragging = true;
        this.getItems()
        this.selectedItem = this.getItem(e.pageX, e.pageY);
        const itemPosition = this.selectedItem.getBoundingClientRect();
        this.lastPosition = {
            x: e.pageX,
            y: e.pageY
        }
	
        // Render dragItem
        this.dragItem = this.options.dragholder(this.selectedItem);
        this.selectedItem.insertAdjacentElement('beforebegin', this.dragItem);
        this.dragItem.style.left = e.pageX + "px"
        this.dragItem.style.top = e.pageY + "px"
        this.dragItem.style.marginTop = itemPosition.top - e.pageY + "px"
        this.dragItem.style.marginLeft = itemPosition.left - e.pageX + "px"
    
        // Render placeholder
        if(typeof this.options.placeholder == 'string') {
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
    
        this.options.dragStart(this.items);
    }
  
    dragEnd () {
        if(!this.dragging) return;
        Object.keys(this.selectedItem.styleWas).forEach(style => {
            this.selectedItem.style[style] = this.selectedItem.styleWas[style]
        })
        this.dragItem.parentNode.removeChild(this.dragItem);
        this.placeholder.parentNode.removeChild(this.placeholder);
    
        delete this.lastPosition;
        delete this.placeholder;
        delete this.dragItem;
        delete this.selectedItem;
    
        window.removeEventListener('mousemove', this.mouseMove);
        window.removeEventListener('keyup', this.keyUp);
    
        this.options.dragEnd(this.items);
    
        this.dragging = false;
    }
  
    drop () {
        this.placeholder.insertAdjacentElement('beforebegin', this.selectedItem);
        this.dragEnd();
        this.options.drop(this.getItems());
    }
  
    getItem(x, y) {
        let item;
        this.items.forEach(i => {
            const viewportPosition = i.getBoundingClientRect();
            const position = {
                left: viewportPosition.left + window.scrollX,
                right: viewportPosition.right + window.scrollX,
                top: viewportPosition.top + window.scrollY,
                bottom: viewportPosition.bottom + window.scrollY
            }
            if (position.left <= x && position.right >= x && position.top <= y && position.bottom >= y){
                item = i
            }
        })
        return item;
    }
  
    getItems() {
        this.items = this.options.itemSelector ? this.el.querySelectorAll(this.options.itemSelector) : Array.from(this.el.children)
        return this.items
    }
 
}
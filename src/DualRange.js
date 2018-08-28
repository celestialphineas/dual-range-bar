import { dualHrangeClassName, dualVrangeClassName } from './definitions';

class DualRange {
    constructor(htmlElement) {
        if(typeof htmlElement === 'string') {
            htmlElement = document.getElementById(htmlElement);
        }

        // Store this in the static 
        if(!DualRange.dict) DualRange.dict = {};
        DualRange.dict[htmlElement.id] = this;

        var dualRangeElement = this.dualRangeElement = htmlElement;

        this.backgroundDiv          = document.createElement('div');
        this.backgroundDiv.classList.add('dual-background');

        this.firstSliderContainer   = document.createElement('div');
        this.firstSliderContainer.classList.add('dual-first', 'dual-container');
        this.firstSlider            = this.firstSliderContainer.appendChild(document.createElement('div'));
        this.firstSlider.classList.add('dual-first', 'dual-slider');

        this.rangeSliderContainer   = document.createElement('div');
        this.rangeSliderContainer.classList.add('dual-range', 'dual-container');
        this.rangeSlider            = this.rangeSliderContainer.appendChild(document.createElement('div'));
        this.rangeSlider.classList.add('dual-range', 'dual-slider');

        this.lastSliderContainer    = document.createElement('div');
        this.lastSliderContainer.classList.add('dual-last', 'dual-container');
        this.lastSlider             = this.lastSliderContainer.appendChild(document.createElement('div'));
        this.lastSlider.classList.add('dual-last', 'dual-slider');

        function getEleAttVal(att, fallback) {
            let attVal = dualRangeElement.getAttribute(att);
            if(attVal) {
                attVal = Number.parseFloat(attVal);
                if(!isNaN(attVal)) return attVal;
            } 
            return fallback;
        }
        // Some members hided by naming
        this._lowerBound = getEleAttVal('lower-bound', 0);
        this._upperBound = getEleAttVal('upper-bound', 1);
        // Function type: (newValue: number) => void
        this._setLowerBoundCallbacks = [];
        this._setUpperBoundCallbacks = [];

        this._lowerRange = getEleAttVal('lower-range', 0);
        this._upperRange = getEleAttVal('upper-range', 1);
        this._minDifference = getEleAttVal('min-difference', 0.1);
        // Function type: (newValue: number) => void
        this._setLowerRangeCallbacks = [];
        this._setUpperRangeCallbacks = [];

        // Add callbacks for re-positioning
        window.addEventListener('resize', () => { this.updatePositions.call(this) });
        dualRangeElement.addEventListener('change', () => { this.updatePositions.call(this) });

        // Handle mouse events
        // State parameters
        this._latestMouseActiveValue = null;
        this._firstMouseDown = false;
        this._rangeMouseDown = false;
        this._lastMouseDown = false;
        this._firstMouseOn = false;
        this._rangeMouseOn = false;
        this._lastMouseOn = false;
        this.firstSlider.addEventListener('mouseenter', (event) => { this._firstMouseOn = true; });
        this.rangeSlider.addEventListener('mouseenter', (event) => { this._rangeMouseOn = true; });
        this.lastSlider.addEventListener('mouseenter', (event) => { this._lastMouseOn = true; });
        this.firstSlider.addEventListener('mouseleave', (event) => { this._firstMouseOn = false; });
        this.rangeSlider.addEventListener('mouseleave', (event) => { this._rangeMouseOn = false; });
        this.lastSlider.addEventListener('mouseleave', (event) => { this._lastMouseOn = false; });
        window.addEventListener('mousedown', (event) => {
            this._latestMouseActiveValue = this.getMouseValue(event);
            [this._firstMouseDown, this._rangeMouseDown, this._lastMouseDown]
                = [this._firstMouseOn, this._rangeMouseOn, this._lastMouseOn];
        })
        window.addEventListener('mouseup', (event) => {['_firstMouseDown', '_rangeMouseDown', '_lastMouseDown'].map((prop) => {this[prop] = false});})
        window.addEventListener('mousemove', (event) => {
            if(this._firstMouseDown) {
                var val = this.getMouseValue(event);
                if(val < this._lowerBound) {
                    this.lowerRange = this._lowerBound;
                } else if(val >= this._lowerBound && val <= this._upperRange - this._minDifference) {
                    this.lowerRange = val;
                } else {
                    if(val <= this._upperBound - this._minDifference) {
                        this.lowerRange = val;
                        this.upperRange = val + this._minDifference;
                    } else {
                        this.lowerRange = this._upperRange - this._minDifference;
                    }
                }
            }
            if(this._rangeMouseDown) {
                var val = this.getMouseValue(event);
                var d = val - this._latestMouseActiveValue;
                this._latestMouseActiveValue = val;
                if(this._lowerRange + d < this._lowerBound) {
                    this.upperRange = this._lowerBound + this._upperRange - this._lowerRange;
                    this.lowerRange = this._lowerBound;
                } else if(this._upperRange + d > this._upperBound) {
                    this.lowerRange = this._upperBound - (this._upperRange - this._lowerRange);
                    this.upperRange = this._upperBound;
                } else {
                    this.lowerRange = this._lowerRange + d;
                    this.upperRange = this._upperRange + d;
                }
            }
            if(this._lastMouseDown) {
                var val = this.getMouseValue(event);
                if(val < this._lowerRange + this._minDifference) {
                    if(val >= this._lowerBound + this._minDifference) {
                        this.upperRange = val;
                        this.lowerRange = val - this._minDifference;
                    } else {
                        this.upperRange = this._lowerRange + this._minDifference;
                    }
                } else if(val >= this._lowerRange + this._minDifference && val <= this._upperBound) {
                    this.upperRange = val;
                } else {
                    this.upperRange = this._upperBound;
                }
            }
        });
        this.rangeSlider.addEventListener('mousewheel', (event) => {
            let val = this.getMouseValue(event);
            let d = event.wheelDelta/1000;
            let expectedLowerRange = this._lowerRange + (val - this._lowerRange) * d;
            let expectedUpperRange = this._upperRange - (this._upperRange - val) * d;
            if(expectedLowerRange < this._lowerBound) expectedLowerRange = this._lowerBound;
            if(expectedUpperRange > this._upperBound) expectedUpperRange = this._upperBound;
            if(expectedUpperRange - expectedLowerRange < this._minDifference) {
                expectedLowerRange = expectedUpperRange - this._minDifference;
                if(expectedLowerRange < this._lowerBound) {
                    expectedLowerRange = this._lowerBound;
                    expectedUpperRange = this._lowerBound + this._minDifference;
                }
            }
            this.lowerRange = expectedLowerRange;
            this.upperRange = expectedUpperRange;
        });
        this.backgroundDiv.addEventListener('mousewheel', (event) => {
            let d = -event.wheelDelta/(this._upperRange - this._lowerRange)/1000;
            let expectedLowerRange = this._lowerRange + d;
            let expectedUpperRange = this._upperRange + d;
            if(expectedLowerRange < this._lowerBound) {
                expectedLowerRange = this._lowerBound;
                expectedUpperRange = this._lowerBound + this._upperRange - this._lowerRange;
            }
            if(expectedUpperRange > this._upperBound) {
                expectedUpperRange = this._upperBound;
                expectedLowerRange = this._upperBound - (this._upperRange - this._lowerRange);
            }
            this.lowerRange = expectedLowerRange;
            this.upperRange = expectedUpperRange;
        });

        // Call update positions when values updated
        this.addLowerRangeChangeCallback((val) => {
            this.updateFirstPosition(val);
            this.updateRange(val, null);
        });
        this.addUpperRangeChangeCallback((val) => {
            this.updateLastPosition(val);
            this.updateRange(null, val);
        });
    }
    // Value members
    get lowerBound() { return this._lowerBound; }
    set lowerBound(newVal) {
        this._lowerBound = newVal;
        this._setLowerBoundCallbacks.forEach((fun) => {
            fun.apply(window, [newVal]);
        });
    }
    get upperBound() { return this._upperBound; }
    set upperBound(newVal) {
        this._upperBound = newVal;
        this._setUpperBoundCallbacks.forEach((fun) => {
            fun.apply(window, [newVal]);
        });
    }
    get lowerRange() { return this._lowerRange; }
    set lowerRange(newVal) {
        this._lowerRange = newVal;
        this._setLowerRangeCallbacks.forEach((fun) => {
            fun.apply(window, [newVal]);
        });
    }
    get upperRange() { return this._upperRange; }
    set upperRange(newVal) {
        this._upperRange = newVal;
        this._setUpperRangeCallbacks.forEach((fun) => {
            fun.apply(window, [newVal]);
        });
    }
    // Methods
    createInHrangeElements() {
        this.dualRangeElement.appendChild(this.backgroundDiv);
        this.dualRangeElement.appendChild(this.firstSliderContainer);
        this.dualRangeElement.appendChild(this.rangeSliderContainer);
        this.dualRangeElement.appendChild(this.lastSliderContainer);
    }
    updatePositions() {
        this.updateFirstPosition(this._lowerRange);
        this.updateRange(this._lowerRange, this._upperRange);
        this.updateLastPosition(this._upperRange);
    }
    // callback: (newValue: number) => void
    addLowerRangeChangeCallback(callback) {
        this._setLowerRangeCallbacks.push(callback);
    }
    addUpperRangeChangeCallback(callback) {
        this._setUpperRangeCallbacks.push(callback);
    }
    addLowerBoundChangeCallback(callback) {
        this._setLowerBoundCallbacks.push(callback);
    }
    addUpperBoundChangeCallback(callback) {
        this._setUpperBoundCallbacks.push(callback);
    }

    // This static function is used to get the DualRange object
    static getObject(id) {
        if(typeof DualRange.dict[id] !== 'undefined') {
            return DualRange.dict[id];
        } else {
            let ele = document.getElementById(id);
            if(ele.classList.contains(dualHrangeClassName)) {
                return DualHRange(id);
            } else if(ele.classList.contains(dualVrangeClassName)) {
                return DualVRange(id);
            } else return null;
        }
    }
}

export class DualHRange extends DualRange {
    constructor(htmlElement) {
        super(htmlElement);
        [
            this.backgroundDiv,
            this.firstSliderContainer, this.firstSlider,
            this.rangeSliderContainer, this.rangeSlider,
            this.lastSliderContainer, this.lastSlider
        ].forEach((div) => div.classList.add('dual-horizontal'));
        super.createInHrangeElements();
        super.updatePositions();
    }
    _updateHorizontalPosition(val, container) {
        let offsetTop = this.dualRangeElement.offsetTop;
        let offsetLeft = this.dualRangeElement.offsetLeft;
        let eleWidth = this.dualRangeElement.clientWidth;
        let eleHeight = this.dualRangeElement.clientHeight;
        let percentage = (val - this.lowerBound)/(this.upperBound - this.lowerBound);

        let top = offsetTop;
        let left = offsetLeft + percentage * eleWidth - this.firstSliderContainer.clientWidth/2;
        container.style.top = `${top}px`;
        container.style.left = `${left}px`;
        container.style.height = `${eleHeight}px`;
    }
    updateFirstPosition(val) {
        this._updateHorizontalPosition(val, this.firstSliderContainer);
    }
    updateLastPosition(val) {
        this._updateHorizontalPosition(val, this.lastSliderContainer);
    }
    updateRange(val1, val2) {
        if(typeof val1 === 'number' && !isNaN(val1)) {
            let oldLeft = this.rangeSliderContainer.offsetLeft;
            let oldWidth = this.rangeSliderContainer.clientWidth;
            let oldRight = oldLeft + oldWidth;
            let percentage = (val1 - this.lowerBound)/(this.upperBound - this.lowerBound);
            let newLeft = this.dualRangeElement.offsetLeft
                + percentage * this.dualRangeElement.clientWidth;
            let newWidth = oldRight - newLeft;
            this.rangeSliderContainer.style.left = `${newLeft}px`;
            this.rangeSliderContainer.style.width = `${newWidth}px`;
        }

        if(typeof val2 === 'number' && !isNaN(val2)) {
            let oldLeft = this.rangeSliderContainer.offsetLeft;
            let percentage = (val2 - this.lowerBound)/(this.upperBound - this.lowerBound);
            let newRight = this.dualRangeElement.offsetLeft
                + percentage * this.dualRangeElement.clientWidth;
            let newWidth = newRight - oldLeft;
            this.rangeSliderContainer.style.width = `${newWidth}px`;
        }

        this.rangeSliderContainer.style.top = `${this.dualRangeElement.offsetTop}px`;
        this.rangeSliderContainer.style.height = `${this.dualRangeElement.clientHeight}px`;
    }
    getMouseValue(event) {
        let relativeX = event.clientX - this.dualRangeElement.offsetLeft;
        let percentage = relativeX / this.dualRangeElement.clientWidth;
        return percentage * (this.upperBound - this.lowerBound) + this.lowerBound;
    }

    // override
    static getObject(id) {
        if(typeof DualRange.dict[id] !== 'undefined') {
            return DualRange.dict[id];
        } else return DualHRange(id);
    }
}

export class DualVRange extends DualRange {
    constructor(htmlElement) {
        super(htmlElement);
        [
            this.backgroundDiv,
            this.firstSliderContainer, this.firstSlider,
            this.rangeSliderContainer, this.rangeSlider,
            this.lastSliderContainer, this.lastSlider
        ].forEach((div) => div.classList.add('dual-vertical'));
        super.createInHrangeElements();
        super.updatePositions();
    }
    _updateVerticalPosition(val, container) {
        let offsetTop = this.dualRangeElement.offsetTop;
        let offsetLeft = this.dualRangeElement.offsetLeft;
        let eleWidth = this.dualRangeElement.clientWidth;
        let eleHeight = this.dualRangeElement.clientHeight;
        let percentage = (val - this.lowerBound)/(this.upperBound - this.lowerBound);

        let top = offsetTop + percentage * eleHeight - this.firstSliderContainer.clientHeight/2;
        let left = offsetLeft;
        container.style.top = `${top}px`;
        container.style.left = `${left}px`;
        container.style.width = `${eleWidth}px`;
    }
    updateFirstPosition(val) {
        this._updateVerticalPosition(val, this.firstSliderContainer);
    }
    updateLastPosition(val) {
        this._updateVerticalPosition(val, this.lastSliderContainer);
    }
    updateRange(val1, val2) {
        if(typeof val1 === 'number' && !isNaN(val1)) {
            let oldTop = this.rangeSliderContainer.offsetTop;
            let oldHeight = this.rangeSliderContainer.clientHeight;
            let oldBottom = oldTop + oldHeight;
            let percentage = (val1 - this.lowerBound)/(this.upperBound - this.lowerBound);
            let newTop = this.dualRangeElement.offsetTop
                + percentage * this.dualRangeElement.clientHeight;
            let newHeight = oldBottom - newTop;
            this.rangeSliderContainer.style.top = `${newTop}px`;
            this.rangeSliderContainer.style.height = `${newHeight}px`;
        }

        if(typeof val2 === 'number' && !isNaN(val2)) {
            let oldTop = this.rangeSliderContainer.offsetTop;
            let percentage = (val2 - this.lowerBound)/(this.upperBound - this.lowerBound);
            let newBottom = this.dualRangeElement.offsetTop
                + percentage * this.dualRangeElement.clientHeight;
            let newHeight = newBottom - oldTop;
            this.rangeSliderContainer.style.height = `${newHeight}px`;
        }

        this.rangeSliderContainer.style.left = `${this.dualRangeElement.offsetLeft}px`;
        this.rangeSliderContainer.style.width = `${this.dualRangeElement.clientWidth}px`;
    }
    getMouseValue(event) {
        let relativeY = event.clientY - this.dualRangeElement.offsetTop;
        let percentage = relativeY / this.dualRangeElement.clientHeight;
        return percentage * (this.upperBound - this.lowerBound) + this.lowerBound;
    }

    // override
    static getObject(id) {
        if(typeof DualRange.dict[id] !== 'undefined') {
            return DualRange.dict[id];
        } else return DualVRange(id);
    }
}
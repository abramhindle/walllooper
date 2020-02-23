"use strict";
// - [X] Draw Overlays
// - [X] Click and add overlays
// - [ ] Click to remove overlays?
// - [ ] Audio
function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return { x: x, y: y};
}

function testItems() {
    var items = [
        {        
            length: 30,
            colour: "pink",
            name: "shortest"
        },
        {        
            length: 60,
            colour: "blue",
            name: "short"
        },
        {        
            length: 120,
            colour: "red",
            name: "medium"
        },
        {        
            length: 240,
            colour: "green",
            name: "long"
        }
    ];
    return items;
}
function testOverlays() {
    var overlays = [
        {
            offset: 5,
            length: 5
        },
        {
            offset: 25,
            length: 25
        },
        {
            offset: 120,
            length: 10
        },
        {
            offset: 120,
            colour: "white",
            length: 72
        }
    ];
    return overlays
}

class Waveform {
    constructor( item ) {
        this.length = item.length;
        this.colour = item.colour;
        this.name   = item.name;
        this.prop   = item;
    }
}

class Overlay {
    constructor( overlay ) {
        this.prop = overlay;
        this.length = overlay.length;
        this.colour = overlay.colour;
        this.name   = overlay.name;
        this.offset = overlay.offset;
    }
    offsetWithin(offset) {
        return offset >= this.offset && offset < (this.offset + this.length);
    }
}

class BoxLooper {
    constructor(items, overlays) {
        this.items = items || [];
        this.listeners = [];
        this.overlays = overlays || [];
    }
    addOverlay( overlay ) {
        if (overlay instanceof Overlay) {
            this.overlays.push( overlay );
        } else {
            this.overlays.push( new Overlay( overlay ) );
        }
        this.update();
    }
    addItem( item ) {
        if (item instanceof Waveform) {
            this.items.push( item );
        } else {
            this.items.push( new Waveform(item) );
        }
        this.update();
    }
    getOverlays() {
        return this.overlays;
    }
    getItems() {
        return this.items;
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    update() {
        this.listeners.forEach( listener => {
            listener.update(this);
        });
    }
    removeOverlayAtOffset( offset ) {
        let overlays = this.overlays.filter(
            o => ! o.offsetWithin( offset )
        );
        this.overlays = overlays;
        this.update();
    }
}

class BoxPlot {
    constructor(canvas, ctx, model) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.model = model;
        this.installClickListeners();
        this.itemHeight = 100;
        this.widthSeconds =  60;
    }
    update(model) {
        this.drawPoints(model);
    }
    redraw() {
        this.drawPoints(this.model);
    }
    drawRectangle( row, col, length, colour, context) {
        let canvas = this.canvas;
        let width = canvas.width;
        let height = canvas.height;
        let ih = context["ih"] || this.itemHeight;
        let ws = context["ws"] || this.widthSeconds;
        ctx.fillStyle = colour;
        let x = width *(1.0*col) / ws;
        let y = row * ih;
        let w = width * (1.0*length) / ws;
        ctx.fillRect(x, y, w, ih);
    }
    drawOverlay( overlay, context ) {
        let offset = overlay.offset;
        let ih = context["ih"] || this.itemHeight;
        let ws = context["ws"] || this.widthSeconds;        
        let colour  = overlay.colour || "black";
        let rlength = overlay.length;
        let wlength = rlength;
        let row = Math.floor(offset / ws);
        let col = offset - row * ws;
        this.ctx.globalAlpha = 0.3;
        do {
            // case 1 it fits on this line
            if (col + rlength < ws) {
                this.drawRectangle(row, col, rlength, colour, context);
                rlength = 0;
            } else if (col + rlength >= ws) { // from col to end of line
                this.drawRectangle(row, col, ws - col, colour, context);
                rlength -= (ws - col);
                col = 0;
                row += 1;
            }
        } while( rlength > 0 );
        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;

    }

    drawWaveform( waveform, offset, context ) {
        let ih = context["ih"] || this.itemHeight;
        let ws = context["ws"] || this.widthSeconds;
        let colour = waveform.colour;
        let rlength = waveform.length;
        let wlength = rlength;
        let row = Math.floor(offset / ws);
        let col = offset - row * ws;
        do {
            // case 1 it fits on this line
            if (col + rlength < ws) {
                this.drawRectangle(row, col, rlength, colour, context);
                rlength = 0;
            } else if (col + rlength >= ws) { // from col to end of line
                this.drawRectangle(row, col, ws - col, colour, context);
                rlength -= (ws - col);
                col = 0;
                row += 1;
            }
        } while( rlength > 0 );
    }
    drawPoints(model) {
        this.lastModel = model;
        let canvas = this.canvas;
        let width = canvas.width;
        let height = canvas.height;
        let itemHeight = this.itemHeight;
        let widthSeconds = this.widthSeconds;
        // draw items
        let offset = 0;
        let context = {
            ih: itemHeight,
            ws: widthSeconds
        };

        ctx.fillStyle = "grey";
        ctx.fillRect(0, 0, width, height);
        for (let item of model.getItems()) {
            this.drawWaveform( item, offset, context );
            offset += item.length;
        }
        // draw overlay
        for (let item of model.getOverlays()) {
            this.drawOverlay( item, context );
        }

    }
    posToOffset( pos, context ) {
        let canvas = this.canvas;
        let width = canvas.width;
        let height = canvas.height;
        let ih = (context && context["ih"]) || this.itemHeight;
        let ws = (context && context["ws"]) || this.widthSeconds;
        let col = ws * 1.0 * pos.x / width;
        let row = Math.floor(pos.y  / ih);
        let offset = col + row * ws;
        return {offset:offset, row: row, col: col}
    }
    installClickListeners() {
        let canvas = this.canvas;
        let clicked = false;
        let first = false;
        let firstPos = undefined;
        let lastOverlay = undefined;
        let moved = false;
        // state enter dragging or deleting
        canvas.addEventListener('mousedown', (e) => clicked = first = true);
        canvas.addEventListener('mouseup', (e) => {
            if (clicked && lastOverlay) {
                // state dragging
                // add an overlay
                let newOverlay = { offset: lastOverlay.offset,
                                   length: lastOverlay.length
                                 };
                this.model.addOverlay( newOverlay );
                lastOverlay = undefined;
            } else if (clicked) {
                const pos = getCursorPosition(canvas, e);
                const offsetColRow = this.posToOffset(pos, {});
                model.removeOverlayAtOffset( offsetColRow.offset );
            }
            first = false;
            moved = false;
            clicked = false;
        });
        canvas.addEventListener('mouseout', (e) => {clicked = false;
                                                    lastOverlay = undefined;                                                    
                                                    this.redraw() });
        let listener = (e) => {
            moved = true;
            if (! clicked ) { return; }
            const pos = getCursorPosition(canvas, e);
            const offsetColRow = this.posToOffset(pos, {});
            if ( first ) {
                first = false;
                firstPos = offsetColRow;
            }
            // state dragging or deleting

            let len = offsetColRow.offset - firstPos.offset;
            this.drawPoints( this.model );
            lastOverlay = { offset: firstPos.offset, length: len, colour: "white" };
            this.drawOverlay( lastOverlay , {} );


        };
        // canvas.addEventListener('click', listener);
        canvas.addEventListener('mousemove', listener);
    }
}


"use strict";
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
}

class BoxLooper {
    constructor(items, overlays) {
        this.items = items || [];
        this.listeners = [];
        this.overlays = overlays || [];
    }
    addOverlay( overlay ) {
        if (item instanceof Overlay) {
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
        console.log([colour, row,col,x, y, w, ih]);
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
            console.log(["Overlay",offset, wlength,rlength]);
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
    }

    drawWaveform( waveform, offset, context ) {
        let ih = context["ih"] || this.itemHeight;
        let ws = context["ws"] || this.widthSeconds;
        let colour = item.colour;
        let rlength = waveform.length;
        let wlength = rlength;
        let row = Math.floor(offset / ws);
        let col = offset - row * ws;
        do {
            console.log([colour,wlength,rlength]);
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
        console.log("drawPoints");
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

        for (item of model.getItems()) {
            this.drawWaveform( item, offset, context );
            offset += item.length;
        }
        // draw overlay
        for (item of model.getOverlays()) {
            this.drawOverlay( item, context );
        }

    }
    installClickListeners() {
        let canvas = this.canvas;
        let clicked = false;
        canvas.addEventListener('mousedown', (e) => clicked = true);
        canvas.addEventListener('mouseup', (e) => clicked = false);
        canvas.addEventListener('mouseout', (e) => clicked = false);
        let listener = (e) => {
            // if (! clicked ) { return; }
            if (this.dims === undefined || this.lastModel === undefined) {
                return;
            }
            const pos = getCursorPosition(canvas, e);
            let row = Math.floor( pos.y / this.ph );
            let col = Math.floor( pos.x / this.pw );
            let x = this.pmin + this.prange * (pos.x - col * this.pw) / this.pw;
            let y = this.pmin + this.prange * (pos.y - row * this.ph) / this.ph;
            // do something!
        };
        // canvas.addEventListener('click', listener);
        canvas.addEventListener('mousemove', listener);
    }
}


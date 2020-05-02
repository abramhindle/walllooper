"use strict";
// - [X] Draw Overlays
// - [X] Click and add overlays
// - [X] Click to remove overlays?
// - [X] Audio
// - [X] Fix audio glitch
// - [X] delete mode?
// - [X] add touch events
// - [X] Test Touch Events
// - [X] Fix the offset issue
// - [X] clicks / envelopes
// - [ ] support multiple clips
// - [ ] size canvas to screen
// - [ ] Fix touch dimensions
// - [ ] Add URL
/*
function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return { x: x, y: y};
}*/
function getCursorPosition(canvas, e) {
    if ( e.targetTouches && e.targetTouches.length > 0) {
        var touch = e.targetTouches[0];
        const rect = canvas.getBoundingClientRect();
        var x = touch.pageX  - rect.left;
        var y = touch.pageY  - rect.top;
        return { x: x, y: y};
    } else {
        //var rect = e.target.getBoundingClientRect();
        const rect = canvas.getBoundingClientRect();
        /* var x = e.offsetX || e.pageX - rect.left - window.scrollX;
        var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
        var x = e.pageX  - canvas.offsetLeft;
        var y = e.pageY  - canvas.offsetTop; */
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x: x, y: y};
    }
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
        this.fixOrder();
    }
    fixOrder() {
        if (this.length < 0) {
            let len = this.offset - (this.offset + this.length);
            let offset = this.offset + this.length;
            this.offset = offset;
            this.length = len;
        }
    }
    offsetWithin(offset) {
        return offset >= this.offset && offset < (this.offset + this.length);
    }
    overlaps(off1,off2) {
        // offset with off1 and off2
        if (this.offset >= off1 && this.offset <= off2) {
            return true;
        }
        // offset + length within off1 and off2
        if (this.offset + this.length >= off1 && this.offset + this.length <= off2) {
            return true;
        }
        // off1 and off2 within offset and offset.length
        if (off1 >= this.offset && off1 <= this.offset+this.length) {
            return true;
        }
        if (off2 >= this.offset && off2 <= this.offset+this.length) {
            return true;
        }
        return false;
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
    removeOverlaysBetween( offset, offset2 ) {
        let overlays = this.overlays.filter(
            o => ! o.overlaps(offset, offset2)
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
        this.deleteMode = false;
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
    drawWave( row, col, length, startTime, endTime, context, buffer) {
	if (! this.drawCache ) {
		this.drawCache = {};
	}
        let canvas = this.canvas;
        let width = canvas.width;
        let height = canvas.height;
        let ih = context["ih"] || this.itemHeight;
        let ws = context["ws"] || this.widthSeconds;
        let x = width *(1.0*col) / ws;
        let y = row * ih;
        let w = width * (1.0*length) / ws;
        let channel = buffer.getChannelData(0);
	let n = channel.length;
	let startSample = Math.floor(startTime * buffer.sampleRate);
	let endSample = Math.floor(endTime * buffer.sampleRate);
	let samples = endSample - startSample;
	let r = 255;
	let g = 0;
	let b = 0;
	//   ctx.fillStyle = "rgba("+r+","+g+","+b+","+(128/255)+")";
        // ctx.fillStyle = "rgb("+r+","+g+","+b+")";
	var px = ctx.createImageData(1, 1); 
	var d = px.data;
        d[0] = r;
        d[1] = g;
        d[2] = b;
        d[3] = 255;
	let sampleW = w / samples;
	console.log(sampleW);
	let cachekey = [ row, col, length, startTime, endTime ].join(" ");
	if ( this.drawCache[cachekey] ) {
		ctx.putImageData(this.drawCache[cachekey],x,y);
	} else {
		for (var i = 0; i < w;i+=0.1) {
			ctx.putImageData(px, Math.floor(x+i), Math.floor(y+0.5*ih+0.5*ih*channel[Math.floor(startSample+i*samples/w)]));
		}
		var cache = ctx.getImageData(x,y,Math.max(1,w), ih); 
		this.drawCache[cachekey] = cache;
	        //ctx.fillRect(x, y, w, ih);
	}
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
	let startTime = 0;
        do {
            // case 1 it fits on this line
            if (col + rlength < ws) {
                this.drawRectangle(row, col, rlength, colour, context);
		this.drawWave(row,col,rlength,startTime, startTime+rlength,context, waveform.prop.buffer);
		startTime += rlength;
                rlength = 0;
            } else if (col + rlength >= ws) { // from col to end of line
		let wt = ws - col;
                this.drawRectangle(row, col, wt, colour, context);
		this.drawWave(row,col,wt,startTime, startTime+wt,context, waveform.prop.buffer);
                rlength -= wt;
		startTime += wt;
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
    setDeleteMode(v) {
        this.deleteMode = v;
    }
    installClickListeners() {
        let canvas = this.canvas;
        let clicked = false;
        let first = false;
        let firstPos = undefined;
        let lastOverlay = undefined;
        let moved = false;
        // state enter dragging or deleting
        let mousedown = (e) => {clicked = first = true};

        let mouseup = (e) => {
            if (clicked && lastOverlay && this.deleteMode) {
                model.removeOverlaysBetween( lastOverlay.offset, lastOverlay.offset +  lastOverlay.length);
                lastOverlay = undefined;                
            } else if (clicked && lastOverlay) {
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
        };
        let mouseout = (e) => {clicked = false;
                               lastOverlay = undefined;                                                    
                               this.redraw() };

        let mousemove = (e) => {
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
        canvas.addEventListener('mouseout',  mouseout);
        canvas.addEventListener('mousedown', mousedown);
        canvas.addEventListener('mouseup',   mouseup);
        canvas.addEventListener('mousemove', mousemove);
        let touchstart = (e) => { 
            this.lasttouch = e;                                         
            return mousedown(e);
        };
        let touchend  = (e) => {
            var touch = (this.lasttouch)?this.lasttouch:e;
            return mouseup(touch);
        };
        let touchmove = (e) => {
            this.lasttouch = e;                                         
            return mousemove(e);
        };
        canvas.addEventListener('touchstart',  touchstart);
        canvas.addEventListener('touchend', touchend);
        canvas.addEventListener('touchmove',   touchmove);
   }
}

// MDN example https://mdn.github.io/webaudio-examples/decode-audio-data/
var audioCtx;
var defaultSounds = ['reverb-1234567-dtmf.ogg'];

// load an individual sound
// load Sounds and call a callback
// initialize web audio -- must be clicked @_@
function startSound() {
  if (audioCtx === undefined) {
      // Fix iOS Audio Context by Blake Kus https://gist.github.com/kus/3f01d60569eeadefe3a1
      // MIT license
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
      // prime the pump!
      var buffer  = audioCtx.createBuffer(1, 1, 22050);
      var silence = audioCtx.createBufferSource();
      silence.buffer = buffer;
      // Connect to output (speakers)
      silence.connect(audioCtx.destination);
      // Play sound
      if (silence.start) {
        silence.start(0);
      } else if (silence.play) {
        silence.play(0);
      } else if (silence.noteOn) {
        silence.noteOn(0);
      }
  }
    return audioCtx;
}

function findZeroCrossing(channel, startSample, direction) {
    let len = channel.length
    let cnt = 0;
    var last = 0;
    var lasti = 0;
    while (startSample >= 0 && startSample < len) {
        let sample = channel[startSample];
        if (sample == 0.0) {
            return startSample;
        }        
        if (cnt > 0) {
            if ( (direction < 0 &&last <= 0 && sample >= 0) || (direction >= 0 && last >= 0 && sample <= 0)) {
                return lasti;
            }
        }
        last = sample;
        lasti = startSample;
        startSample += direction;
        cnt++;
    }
    // we're either at the start or end by now
    return startSample;    
}

function clipBufferAtZeroCrossing(buffer,
                                  startTime,
                                  endTime) {
    let sr = buffer.sampleRate;
    let length = buffer.length;    
    let startSample = Math.floor(sr * startTime);
    let endSample = Math.floor(sr * endTime);
    let nsamples = endSample - startSample;
    if (endSample >= length) {
        endSample = length - 1;
    }
    console.log(buffer);
    let channel = buffer.getChannelData(0);
    // let nchannels = channels.length;
    //let channel = channels[0];
    let szc = findZeroCrossing(channel,startSample,-1);
    let ezc = findZeroCrossing(channel,endSample,1);
    let addStartZero = !(szc >= 0 && channel[szc] == 0.0)?1:0;
    let addEndZero   = !(ezc >= 0 && ezc < length && channel[ezc] == 0.0)?1:0;
    if (ezc >= length) {
        addEndZero = 1;
    }
    let newlen       =   ezc - szc + addEndZero + addStartZero
    let arrayBuffer  =   audioCtx.createBuffer(1, newlen, buffer.sampleRate);//  new Float32Array(newlen);
    let floatBuffer  =   arrayBuffer.getChannelData(0);
    floatBuffer.set(
        channel.subarray(Math.max(0,szc),Math.min(length-1,ezc)),
        addStartZero);
    return arrayBuffer;
}


class SoundView {
    constructor(model) {
        this.model = model;
        this.buffers = {};
    }    
    loadSounds(l) {        
        l = l || defaultSounds;
        this.uris = l;
        for (let uri of l) {
            this.loadSound( uri );
        }
    }
    addBuffer(uri,buff) {
        this.buffers[uri] = buff;
    }
    isDone() {
        let buffers = this.buffers;
        return this.uris.filter( x => buffers[x] ).length ==
            this.uris.length;
    }
    loadSound(soundURI) {
        let request = new XMLHttpRequest();
        let self = this;
        request.open('GET', soundURI, true);    
        request.responseType = 'arraybuffer';    
        request.onload = function() {
            var audioData = request.response;
            var audioCtx = startSound();
            audioCtx.decodeAudioData(audioData, function(buffer) {
                console.log("Decoding "+soundURI);
                let myBuffer = buffer;
                self.addBuffer(soundURI, myBuffer);
                if (self.isDone()) {
                    self.doneLoading();
                }
            },                               
            function(e){"Error with decoding audio data" + e.err});      
        };
        request.send();
    }
    bufferToWaveform(name, buff, colour) {
        colour = colour || "pink";
        return {
            name: name,
            colour: colour,
            length: buff.duration,
	    buffer:  buff
        }
    }
    doneLoading() {
        // add items (buffers)
        for ( let key in this.buffers) {
            let buff = this.bufferToWaveform( key, this.buffers[key], undefined );
            this.model.addItem( buff );
        }
        // listen to the model
        this.overlayMap = [];
        model.addListener( this );       
    }
    update(model) {
        // we need a mapping between overlay and playing buffers
        console.log("CHANGED");
        this.checkOverlayMap();
    }
    deleteOverlay( overlay ) {
        let tuple = this.overlayMap.filter( x => x[0] == overlay )[0];
        console.log(tuple);
        this.overlayMap = this.overlayMap.filter( x => x[0] != overlay );
        tuple[1].loop = false;
        tuple[1].stop();
        
    }
    makeALoop( overlay ) {
        // only handle 1 buffer right now
        let audioCtx = startSound();
        let source = audioCtx.createBufferSource();
        // let items = this.model.getItemsOfOverlay( overlay );
        // let item = items[0].name;
        let item = Object.keys(this.buffers)[0];
        let buffer = this.buffers[item];
        let clip = clipBufferAtZeroCrossing(buffer,
                                            overlay.offset,
                                            overlay.offset + overlay.length);
        source.buffer = clip;
        // console.log(buffer);
        // need the offset done proper
        source.connect(audioCtx.destination);
        // source.loopStart = overlay.offset;
        // source.loopEnd = overlay.offset + overlay.length;
        source.loop = true;
        // source.start(0, overlay.offset);
        source.start(0);
        return source;
    }
    checkOverlayMap() {
        let moverlays = model.getOverlays();
        // check for deleted
        for (let tup of this.overlayMap) {
            let overlay = tup[0]
            if (! moverlays.includes(overlay)) {
                this.deleteOverlay( overlay );
            }
        }
        let currentOverlays = this.overlayMap.map( e => e[0] );
        // the overlays not currently recorded
        let newOverlays = moverlays.filter( x => ! currentOverlays.includes( x ) );
        for (let overlay of newOverlays) {
            let tuple = [overlay, this.makeALoop(overlay)]
            this.overlayMap.push( tuple );
        }
    }
}

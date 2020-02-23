"use strict";
/* goal 1: display boxes */
    /* 1 minute across the screen */
    /* display 30 second, 1 minute, 2 minute, 4 minute */
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
var head = 0;


class BoxLooper {
    constructor(items) {
        this.items = items;
        this.listeners = [];
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    update() {
        this.solve();
        // console.log(this.values);
        this.listeners.forEach( listener => {
            listener.update(this);
        });
    }
}

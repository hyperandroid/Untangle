var assert= require('assert');
var _u= require('../untangle.js');

var signal = new _u.Signal().
    addListener( function() {
        console.log("Multi Shot notified with: '"+arguments[0]+"'");
    }).
    addListenerOnce( function() {
        console.log("Single Shot notified with: '"+arguments[0]+"' and won't be notified again.");
    });

// notify both signal observers
signal.emit("1");

// notify only one signal observer.
// the other one is no more registered.
signal.emit("2");

// clean this Signal. No registered observers.
signal.removeAllListeners();

// will NOT notify any observers.
signal.emit("3");
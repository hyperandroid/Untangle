
var _u= require('../untangle');
var assert= require('assert');

var dispatcher= new _u.Dispatcher();    // create 1 worker.

var future= dispatcher.submit( function(f) {
        // simulate asynchronous by timeout-ing a function.
        setTimeout( function() {        
            // f and the return Future object, are the same one.
            f.setValue("this value comes from the future");

        },
        500 );
    }, 
    1000 ); // submit w/o timeout

// pass along this future object, for lazy evaluation.
future.waitForValueSet( function(f) {
    console.log("Value from the future: "+f.getValue());
});


// this other future object will timeout.
var future2= dispatcher.submit( function(f) {
        // simulate asynchronous by timeout-ing a function.
        setTimeout( function() {        
            // f and the return Future object, are the same one.
            f.setValue("this value will not come from the future");
        },
        200 );
    }, 
    100 ); // submit w/o timeout

future2.waitForValueSet( function(f) {
    console.log("Value from the future: "+f.getValue());
});
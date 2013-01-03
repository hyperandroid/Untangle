var _u= require('../untangle');
var assert= require('assert');

// this example is quite naive. But think about future objects as yet to happen events in the future.
var future= new _u.Future().waitForValueSet( function(future) {
    console.log("Future object got value: "+future.getValue());
});

// somewhere else:
future.setValue("abcd");

// this call has no effect. Future object's set values can't be changed.
future.setValue("efgh");
assert.strictEqual(future.getValue(), "abcd");
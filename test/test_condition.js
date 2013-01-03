var _u= require('../untangle');
var assert= require('assert');

var condition1= new _u.Condition();

console.log( "Condition1 value isTrue: "+condition1.isTrue() );
console.log( "Condition1 value isFalse: "+condition1.isFalse() );
console.log( "Condition1 value isNotSet: "+condition1.isNotSet() );   // conditions initially have no value set.

condition1.waitForTrue( function(condition) {
    assert.strictEqual( condition.isTrue(), true );
    console.log("Condition1 is True.");

});

condition1.waitForFalse( function(condition) {
    assert.strictEqual( condition.isFalse(), true );
    console.log("Condition1 is False.");

});

condition1.waitForStateChange( function(condition) {
    console.log("Condition1 new state: "+condition.getCurrentValue());
});

condition1.waitForTimeout( function( condition ) {
    console.log("Condition1 "+condition.getId()+" timed out.");
});

// this call prints:
//   Condition1 is True.
//   Condition1 new state: 1
condition1.setTrue();

// this second setTrue has no effect since the condition was true already.
condition1.setTrue();

// this call prints:
//  Condition1 is False.
//  Condition1 new state: 0
condition1.setFalse();

// this second setFalse has no effect since the condition was true already.
condition1.setFalse();


// after 200 ms, this condition will automatically be set to false.
// this code prints:
//  condition2 state change. new value: 0
//  condition2 timeout
var condition2= new _u.Condition().
    waitForStateChange( function(c) {
        console.log("condition2 state change. new value: "+ c.getCurrentValue());
    }).
    waitForTimeout( function() {
        console.log("condition2 timeout")
    }).
    setTimeout(200);


var condition3= new _u.Condition().
    waitForStateChange( function(c) {
        console.log("condition3 state change. new value: "+ c.getCurrentValue());
    }).
    waitForTimeout( function() {
        console.log("condition3 timeout")
    }).
    setTimeout(200);

// this call prints:
//    condition3 state change. new value: 1
// and cancels the internal timer.
condition3.setTrue();
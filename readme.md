# Untangle - An asynchronous utility library for Node

## Description

Untangle (_u namespace) aims to put under control the NodeJS asynchronous callback nightmare
by using stateful objects.
Based in the concept of a Condition, it offers fine control for Parallel Condition Tree evaluation and
Queue/Dispatcher/Pool management.
A Condition is a stateful Condition, where setting the same value for a Condition object more than once  will take
no effect.

##How to

Untangle is valid to be used in the browser, NodeJs or as an AMD/Require module.

npm install -g untangle
_u = require('untangle');

## Objects

Untangle offsers a wide variety of objects including:

 * Signal
 * Condition
 * ConditionTree
 * ParallelCondition
 * Future
 * WorkerTask
 * Worker
 * Dispatcher

Dispatcher has several working options.

## Signal

_u.Signal is a string-based observer substitution. Instead of registering events by (commonly) string,
the signal gives context to the event by creating an object which takes care of notifying its observers.
It also takes care of all the burden of managing observers, registering, notifying, etc.

It allows to registers single and multi shot observers.

The signal is agnostic regarding what content will notify to its observers.

Every time the signal emits (notifies observers) the <code>observersOnce</code> collection will be reset.

### Example

```javascript

var signal = new _u.Signal().
    addListener( function() {
        console.log("Multi Shot notified with: ");
    }).
    addListenerOnce( function() {
        console.log("Single Shot notified with: "++" and won't be notified again.");
    });

signal.emit("1");
signal.emit("2");

// clean this Signal. No registered observers.
signal.removeAllListeners();

// will not notify any observers.
signal.emit("3");

```

this code will print

<pre>

// output from signal.emit("1");
Multi Shot notified with: '1'
Single Shot notified with: '1' and won't be notified again.

// output from signal.emit("2");
// Second function was registered as be notified only once.
Multi Shot notified with: '2'

// output from signal.emit("3");
// there were no registered observers at this time.

</pre>



## Condition

_u.Condition is a wrapper for a tri-state condition. Condition values are defined in an @enumeration

 ```javascript
 _u.Condition.VALUES= {
         NOT_SET: -1,
         TRUE : 1,
         FALSE : 0
     };
 ```

The need for a Condition object is that of statefulness. In certain situations, you want to know
whether certain condition has happened in time, and whether it was true or false.

A condition, unless reset (call no setNotSet), will only notify once for each state.
If setTrue is called, successive calls to setTrue won't have any effect.
The same with setFalse. But will notify stateChanges from true to false or vice versa.

Resetting a Condition is achieved with a call to <code>setNotSet</code> and means turning the condition
to its original state, which is NOT_SET, aka the Condition has never been met.

Whenever the Condition changes state, it will notify any registered observers. To do so, the Condition
holds a Signal object.

Conditions can have associated a timeout. If the timer expires, the Condition is automatically set to
false by calling <code>setFalse()</code>. Call <code>setTimeout(milllis)</code> to enable the timer.
The timer will be cancelled when the Condition has its value set either true or false, or when the timer expires,
which will call <code>Condition.setFalse()</code>

You can wait for value changes on a condition by calling
* <code>waitForTrue(callback)</code>
* <code>waitForFalse(callback)</code>
* <code>waitForStateChange(callback)</code>

in all three cases, the callback function will receive the Condition as parameter.

### Example

```javascript
var _u= require('../untangle');
var assert= require('assert');

var condition1= new _u.Condition();

console.log( "Condition1 value isTrue: "+condition1.isTrue() );
console.log( "Condition1 value isFalse: "+condition1.isFalse() );
console.log( "Condition1 value isNotSet: "+condition1.isNotSet() );   // conditions initially have no value set.

condition1.waitForTrue( function(condition) {
    assert.deepEqual( condition.isTrue(), true );
    console.log("Condition1 is True.");

});

condition1.waitForFalse( function(condition) {
    assert.deepEqual( condition.isFalse(), true );
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
```

## ConditionTree

ConditionTree is the extension of a simple Condition object into a full fledged boolean condition tree.

A ConditionTree can contain other trees as conditions to form structures like:
  A or (B and (C or D))

All the base behavior of a simple Condition can be applied to ConditionTree objects.

A condition tree applies fast condition short circuit, notifying as soon as possible about the condition
it represents state changes. The short circuit is based on a boolean operation among all its children which
must be specified by calling <code>setBooleanOperator</code> with a value from
<code>_u.ConditionTree.BOOLEAN_OPERATOR</code>.

A ConditionTree has no limit regarding the tree's depth.

### Example

```javascript
var _u= require('../untangle');
var assert= require('assert');

function waitForTrue(condition) {
    console.log( "Condition '"+condition.getId()+"' is true.");
}
function waitForFalse(condition) {
    console.log( "Condition '"+condition.getId()+"' is false.");
}

var condition1= new _u.Condition();
var condition2= new _u.Condition();

var conditiontree1= new _u.ConditionTree().
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.OR ).
    addCondition( condition1 ).
    addCondition( condition2 ).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 1");

// this call turns conditiontree1 into unknown status since condition2 is still NotSet.
condition1.setFalse();
// after this call, conditiontree1 is set to false.
condition2.setFalse();

conditiontree1.reset();
// this call turns conditiontree1 into unknown status since condition2 is still NotSet.
condition1.setFalse();
// after this call, conditiontree1 is set to true.
condition2.setTrue();

conditiontree1.reset();
// this call turns conditiontree1 true.
condition1.setTrue();
// this call has no effect in conditiontree1 since condition1(true) OR condition2(whatever value) will be true.
condition2.setFalse();

conditiontree1.reset();
// this call turns conditiontree1 true.
condition1.setTrue();
// this call has no effect since conditiontree1 was already true.
condition2.setTrue();



// a ConditionTree can be built out of other ConditionTree objects:

var conditiontree1= new _u.ConditionTree().
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.OR ).
    addCondition( condition1 ).
    addCondition( condition2 ).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 1");
var conditiontree2= new _u.ConditionTree().
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.AND ).
    addCondition( condition3 ).
    addCondition( condition4).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 2");

var conditiontree3= new _u.ConditionTree().
    addCondition( conditiontree1 ).
    addCondition( conditiontree2 ).
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.AND ).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 3");

// and can be timed out as well

conditiontree3.setTimeout(200); // wait up to 200 ms for this condition to become true, otherwise, set it false.

```

## ParallelCondition

A parallel condition object defines a ConditionTree where each condition is associated with an asynchronous
executing function.
It expects a list of functions or other ParallelCondition objects to be asynchronously executed. Each function
to be parallel executed receives a Condition object as parameter which must be either <code>setTrue()</code>
or <code>setFalse()</code>.
When the ParallelCondition is met, already executing asynchronous functions can't be stopped, but they'll have no
effect in the ParallelCondition value.

ParallelCondition inherits all the behavior from ConditionTree and hence from Condition.
The main difference between ParallelCondition and ConditionTree is that ParallelCondition expects asynchronous
executing functions whereas ConditionTree does not. For all the rest, they behave exactly the same (timeout,
, Condition value set behavior, etc.).

```javascript


// create a ParallelCondition as a Boolean OR.
// both functions will be asynchronously called.
var parallel1= new _u.ParallelCondition( [
            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 11 done.");
                    condition.setFalse();
                },
                200);
            },

            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 12 done.");
                    condition.setTrue();
                },
                300);
            }
        ],
        0 // 0 means no timeout
    ).
    setId("Parallel Condition 1").
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.OR ).
    waitForTrue( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is true.");
    }).
    waitForFalse( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is false.");
    }).
    waitForTimeout( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is timeout.");
    });


// define a bigger ParallelCondition object.
// Mix two asynchronous functions with the previous ParallelConditionTree.
var parallel2= new _u.ParallelCondition( [
            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 21 done.");
                    condition.setTrue();
                },
                100);
            },

            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 22 done.");
                    condition.setTrue();
                },
                430);
            },

            parallel1
        ],
        0 ).
    setId("Parallel Condition 2").
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.AND ).
    waitForTrue( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is true.");
    }).
    waitForFalse( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is false.");
    }).
    waitForTimeout( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is timeout.");
    });

parallel2.execute();
```

## Future

Future objects are holders for values of functions (asynchronous or not) which have not been yet executed.
Futures have stateful semantics and their values can be set only once.

Futures expect value observers to register via a call to <code>waitForValueSet</code>.

If you want to test for a valid value in the Future object, a call to <code>isValueSet</code> must
be performed to know whether a value has been set, followed by a call to <code>getValue</code> which
will return the actual value set in this Future object, which can be whichever, including undefined and null.

These Future objects are the base callback results coming from scheduled functions in a @link{_u.Dispatcher} object.
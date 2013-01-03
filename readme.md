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
 * Worker
 * Dispatcher


## Dispatcher

A Dispatcher object sequences the execution of tasks. Internally allocates a predefined number of
_u.Worker instances to handle the submitted asynchronous tasks. When there's no available Worker instances
because they are all busy, a Dispatcher object queues the task submission requests.

A dispatcher, accepts asynchronous functions through out the following methods:

* submit( {function( _u.Future ), timeout )
* submitNodeSequence( {( function | Array.<function()> )}, timeout {number}, haltOnError {Boolean} )
* submitChained( {function( _u.Condition, * )}, timeout )

as a result of all calling these methods, a Dispatcher instance returns a <code>_u.Future</code> object upon which
you can register to know when the submitted task has been executed, and what was the resulting return value.

Each task can be submitted with its own timeout control. This timeout starts counting since the moment the task
is scheduled, not since it is submitted to the Dispatcher object.

The Dispatcher will handle a list of submitted tasks and the specified number of _u.Worker objects
in an attempt to sequentially execute tasks.
If more than one worker is specified in the constructor, there's no sequential execution guarantee
since the workers will have tasks executed on demand.

When one worker expires, the Dispatcher simply creates a new one and kills expired Workers's observers. This means,
that a task running in a Worker may still be active when it has timed out, but it is guaranteed it will not notify
the task associated Future object.

### submitAsNodeSequence

This function executes an array of functions in an effort to untangle NodeJS callback nightmare.
From this:

```javascript

fn( p0, p1, p2, function(err) {
  if (err) {
    throw err;
  }

  fn2( a1, a2, function(err) {
    ...
  }

}
```

you can move to:

```javascript

var future= dispatcher.submitAsNodeSequence([
    function(p0,p1,p2) {
        ...
    },
    function(err) {
        ...
    },
    ...
]);

```

Each Sequence function must follow NodeJS convention by having a first err parameter.
And in order to have the function sequence flowing, each function must:

* return a value, which will be set as second parameter for the next sequence function
* set 'this' as asynchronous function callback

For example:

```javascript
var fs= require('fs');
var _u= require('../untangle');
var assert= require('assert');

var sequencer= new _u.Dispatcher();

sequencer.submitNodeSequence( [
        function( err ) {
            console.log("sequencer seq1");
            fs.readFile('/tmp/version.nfo', 'utf-8', this);  // set this as asynchronous function callback
        },
        function( err, content ) {                  // content has the return value for fs.readFile
            if (err) {
                console.log("error reading file");
                throw "error node series";
            }
            console.log("sequencer seq2");
            console.log(content);
            return 1
        },
        function( err, abcd ) {                     // abcd has value 1.
            console.log("sequencer seq3");
            return "All set";                       // if no return value, the future will get undefined
        }
    ],
    0 ).
    waitForValueSet( function(future) {
        console.log("Future1 set value: "+future.getValue());
    });
```

The flow of this functions sequence may be altered if one of the functions throws an object and
<code>haltOnError</code> is set to true. True is the default value.
In this case, the sequence flow will be interrupted, and the future will have set the value of the throws clause.
If <code>haltOnError</code> is set to false, the sequence will continue, and the next function in the sequence will
receive the thrown error as value in its err parameter.

```javascript
sequencer.submitNodeSequence( [
        function fn1( err ) {
            console.log("sequencer seq1");
            fs.readFile('/tmp/this will cause an error.nfo', 'utf-8', this);  // set this as asynchronous function callback
        },
        function fn2( err, content ) {                  // content is undefined since an err ocurred.
            if (err) {
                console.log("error reading file");
                throw new Error("error node series");
            }
            console.log("sequencer seq2");
            console.log(content);
            return 1
        },
        function fn3( err, abcd ) {                     // abcd has not value 1 and err has an Error object
            console.log("Err has value: "+err);
            console.log("sequencer seq3");
            return "All set";                           // if no return value, the future will get undefined
        }
    ],
    0,
    false ).                                            // WILL NOT HALT ON ERROR
    waitForValueSet( function(future) {
        console.log("Future2 set value: "+future.getValue());
    });

    // in this case, fn3 will receive an Error object as err parameter.
```

### submitChained


### submit

This is the very basic way of working for a dispatcher object.
A function which receives a Future object instance is passed as parameter. The same Future object is returned when
calling submit.
This function is intended for wrapping up NodeJS legacy code. Take all the asynchronous callback tangle and put
it all into one single schedulable function.

The task is scheduled to be executed sometime in the future.

```javascript

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
    1000 ); // submit with 1000ms timeout

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
    100 ); // submit with 100ms timeout

future2.waitForValueSet( function(f) {
    console.log("Value from the future: "+f.getValue());
});

```

###




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
Futures have stateful semantics and their values can be set only once. Internally, a Future object holds a
<code>_u.Condition</code> object to track this future's status.

Futures expect value observers to register via a call to <code>waitForValueSet</code>.

If you want to test for a valid value in the Future object, a call to <code>isValueSet</code> must
be performed to know whether a value has been set, followed by a call to <code>getValue</code> which
will return the actual value set in this Future object, which can be whichever, including undefined and null.

These Future objects are the base callback results coming from scheduled functions in a <code>_u.Dispatcher</code>
object.

```javascript

// this example is quite naive. But think about future objects as yet to happen events in the future.
var future= new _u.Future().waitForValueSet( function(future) {
    console.log("Future object got value: "+future.getValue());
});

// somewhere else:
future.setValue("abcd");

```

## Worker

A Worker is the heart of Dispatcher/Pool objects.
It keeps all the logic needed to execute asynchronous tasks, timeout them, and all the mechanics for
notifying about its internal activity:

* is busy executing an asynchronous function
* is timed out. Timeout is just a notification, since the running asynchronous function can't be cancelled.

It is not expected that the developer will be managing Worker objects directly.

A worker executes all of its tasks in the next tick.


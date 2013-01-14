
var fs= require('fs');
var _u= require('../untangle');
var assert= require('assert');

var sequencer= new _u.Dispatcher();

sequencer.submitNodeSequence( [
        function seq1( err ) {
            console.log("sequencer seq1");
            fs.readFile('/tmp/caat-box2d.js', 'utf-8', this);  // set this as asynchronous function callback
        },
        function seq2( err, content ) {                  // content has the return value for fs.readFile
            if (err) {
                console.log("error reading file");
                throw "error node series";
            }
            console.log("sequencer seq2");
            console.log(content);
            throw "errored just because";
        },
        function seq3( err, abcd ) {                     // abcd has value 1.
            console.log("sequencer seq3");
            return "All set";                       // if no return value, the future will get undefined
        },
        function seq4(err) {
            console.log("sequencer seq4");
        }
    ],
    0 ).
    waitForValueSet( function(future) {
        var v= future.getValue();

        if (v instanceof _u.DispatcherError ) {
            console.log("Future1 error: ");
            console.log("\tException: "+ v.getException());
            console.log("\tStackTrace: "+ v.getStackTrace());
        } else {
            console.log("Future1 set value: "+v);
        }
    });

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


var parallel1= new _u.ParallelCondition( [
            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 1 done.");
                    condition.setFalse();
                },
                200);
            },

            function( condition ) {
                setTimeout( function() {
                    console.log("Asynch function 2 done.");
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
        console.log("___ Condition '"+condition.getId()+"' is true.");
    }).
    waitForFalse( function( condition ) {
        console.log("___ Condition '"+condition.getId()+"' is false.");
    }).
    waitForTimeout( function( condition ) {
        console.log("___ Condition '"+condition.getId()+"' is timeout.");
    });

sequencer.submitCondition( parallel1, 500).waitForValueSet( function(future) {
    console.log("Dispatcher with parallelCondition value: "+future.getValue());
});
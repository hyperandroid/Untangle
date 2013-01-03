var _u= require('../untangle');
var assert= require('assert');

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
        console.log("Condition '"+condition.getId()+"' is true.");
    }).
    waitForFalse( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is false.");
    }).
    waitForTimeout( function( condition ) {
        console.log("Condition '"+condition.getId()+"' is timeout.");
    });


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

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
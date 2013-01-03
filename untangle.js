/**
 * Untangle: untangle the callback nightmare with stateful objects and asynchronous functionality.
 * Objects available:
 *
 *  _u.Signal
 *  _u.Condition
 *  _u.ConditionTree
 *  _u.ParallelCondition
 *  _u.Future
 *  _u.WorkerTask
 *  _u.Worker
 *  _u.Dispatcher
 *
 * @see license.txt file
 *
 */

"use strict";


(function(root) {

    var _u=  {};

    var extend = function (subc, superc) {
        var subcp = subc.prototype;

        // Class pattern.
        var CAATObject = function () {
        };
        CAATObject.prototype = superc.prototype;

        subc.prototype = new CAATObject();       // chain prototypes.
        subc.superclass = superc.prototype;
        subc.prototype.constructor = subc;

        // Reset constructor. See Object Oriented Javascript for an in-depth explanation of this.
        if (superc.prototype.constructor === Object.prototype.constructor) {
            superc.prototype.constructor = superc;
        }

        // los metodos de superc, que no esten en esta clase, crear un metodo que
        // llama al metodo de superc.
        for (var method in subcp) {
            if (subcp.hasOwnProperty(method)) {
                subc.prototype[method] = subcp[method];
            }
        }
    };

    /**
     * Schedule a task in the future.
     * @param f {Function()}
     * @param delay {number=} milliseconds to schedule in the future
     */
    _u.schedule= function( f, delay ) {
        root.setTimeout(f, delay||0 );
    };

    /**
     * ForEach parallel.
     * Schedule each of the Array elements in the future.
     * Do not use directly, it is used internally by the library.
     * @private
     */
    Array.prototype._forEachP= function( ) {
        for( var i=0; i<this.length; i+=1 ) {
            _u.schedule(
                (
                /**
                 *
                 * @param elem {Object}
                 * @param index {number}
                 * @param array {Array=}
                 */
                 function(elem,index,array) {
                    elem.fn( elem.condition, index );
                })(this[i], i, this),
                0
            );
        }
    };

    /**
     * ForEach shim.
     * @type {*|Function}
     * @private
     */
    Array.prototype.forEach= Array.prototype.forEach || function( f ) {
        for( var i=0; i<this.length; i+=1 ) {
            f(this[i], i, this);
        }
    };

    /**
     * Map shim.
     * @type {Function( array_element {object}, index_in_array {*|number} ) }
     */
    Array.prototype.map= Array.prototype.map || function( mapFunc ) {

        var elems= [];

        this.forEach( function( elem, index, array ) {
            elems.push( mapFunc(elem,index,array) );
        });

        return elems;
    };


    /**
     * _u.Signal is a string-based observer substitution. Instead of registering events by (commonly) string,
     * the signal gives context to the event by creating an object which takes care of notifying its observers.
     * It also takes care of all the burden of managing observers, registering, notifying, etc.
     *
     * It allows to registers single and multi shot observers.
     *
     * The signal is agnostic regarding what content will notify to its observers.
     *
     * Every time the signal emits (notifies observers) the <code>observersOnce</code> collection will be reset.
     *
     * @return {*}
     * @constructor
     */
    _u.Signal= function() {
        this.observers= [];
        this.observersOnce= [];
        return this;
    };

    _u.Signal.prototype= {

        /**
         * Multi shot observer list.
         * @private
         */
        observers       : null,

        /**
         * Single shot observer list.
         */
        observersOnce   : null,

        on : function( f ) {
            return this.addListener(f);
        },

        /**
         * Add a multishot observer.
         * @param f {Function(*)} a callback function with variable parameters.
         * @return {*}
         */
        addListener : function( f ) {
            this.observers.push( f );
            return this;
        },

        /**
         * Add a multi shot observer as the first one in the list.
         * @param f {Function(*)} a callback function with variable parameters.
         * @return {*}
         */
        addListenerInFrontOfList : function( f ) {
            this.observers.unshift( f );
            return this;
        },

        /**
         * Remove a multishot observer.
         * @param f {Function()} a previously registered observer by a call to addLitener.
         * @return {*}
         */
        removeListener : function( f ) {
            var index= this.observers.indexOf(f);
            if ( -1!==index ) {
                this.observers.splice( index, 1 );
            }
            return this;
        },

        /**
         * Remove all multishot observers.
         * @return {*}
         */
        removeAllListeners : function() {
            this.observers= [];
            this.observersOnce= [];
            return this;
        },

        /**
         * Add a one shot observer.
         * The callback function will only be called once.
         * @param f {Function()}
         */
        addListenerOnce : function(f) {
            this.observersOnce.push(f);
            return this;
        },

        /**
         * Notify all observers, either sinble/multi shot.
         */
        emit : function() {

            var __arguments= Array.prototype.slice.call(arguments);

            this.observers.forEach( function(e) {
                e.apply( e, Array.prototype.slice.call(__arguments) );
            });
            this.observersOnce.forEach( function(e) {
                e.apply( e, Array.prototype.slice.call(__arguments) );
            });

            this.observersOnce= [];
        }
    };




    var __conditionIndex= 0;
    /**
     * _u.Condition is a wrapper for a tri-state condition.
     *
     * The need for a Condition object is that of statefulness. In certain situations, you want to know
     * whether certain condition has happened in time, and whether it was true or false.
     *
     * A condition, unless reset (call no setNotSet), will only notify once for each state.
     * If setTrue is called, successive calls to setTrue won't have any effect.
     * The same with setFalse. But will notify stateChanges from true to false or vice versa.
     *
     * Resetting a Condition is achieved with a call to <code>setNotSet</code> and means turning the condition
     * to its original state, which is NOT_SET, aka the Condition has never been met.
     *
     * Whenever the Condition changes state, it will notify any registered observers. To do so, the Condition
     * holds a Signal object.
     *
     * Conditions can have associated a timeout. If the timer expires, the Condition is automatically set to
     * false by calling <code>setFalse()</code>.
     *
     * You can wait for value changes on a condition by calling
     * <li><code>waitForTrue(callback)</code>
     * <li><code>waitForFalse(callback)</code>
     * <li><code>waitForStateChange(callback)</code>
     *
     * in all three cases, the callback function will receive the Condition as parameter.
     *
     * A condition usage use case:
     *
     * var c= new _u.Condition().waitForTrue( function(condition) {
     *     // do something here when the condition is met
     *     } );
     *
     * later in the code:
     *
     * c.setTrue();
     *
     * This is no different than setting a callback, but at any given moment, you can ask if the condition has
     * ever had value:
     *
     * c.isNotSet()
     *
     * and if it has ever met, whether it was true or false:
     *
     * c.isTrue() or c.isFalse().
     *
     * @return {*}
     * @constructor
     */
    _u.Condition= function() {
        this.signalConditionStateChange= new _u.Signal();
        this.signalTimeout= new _u.Signal();
        this.b_condition= _u.Condition.VALUES.NOT_SET;
        this.id= 'Condition'+__conditionIndex++;

        return this;
    };

    /**
     * @enum Condition possible values.
     */
    _u.Condition.VALUES= {
        NOT_SET: -1,
        TRUE : 1,
        FALSE : 0
    };

    _u.Condition.prototype= {

        /**
         * internal state value {_u.Condition}
         * @type {_u.Condition.VALUES}
         * @private
         */
        b_condition     : null,

        /**
         * Signal to emit state change events {_u.Signal}
         * @type {_u.Signal}
         * @private
         */
        signalConditionStateChange : null,

        /**
         * Signal to emit condition timed out.
         * @type {_u.Signal}
         */
        signalTimeout : null,

        /**
         * Arbitrary id.
         * @type {*}
         */
        id : null,

        getId : function() {
            return this.id;
        },

        setId : function( id ) {
            this.id= id;
            return this;
        },

        /**
         * Emit condition state change events.
         * @private
         */
        __emit : function() {
            this.signalConditionStateChange.emit(this);
        },

        /**
         * Set a condition as true.
         * If the condition was true, nothing happens.
         * Otherwise, the internal status will be <code>_u.Condition.VALUES.TRUE</code>.
         * Observers of this condition will be notified of the state change.
         * @return {*}
         */
        setTrue : function() {
            if ( this.b_condition===_u.Condition.VALUES.TRUE ) {
                return this;
            }

            this.__cancelTimer();
            this.b_condition= _u.Condition.VALUES.TRUE;
            this.__emit();

            return this;
        },

        /**
         * Set a condition as true.
         * If the condition was false, nothing happens.
         * Otherwise, the internal status will be a value from <code>_u.Condition.VALUES.FALSE</code>.
         * Observers of this condition will be notified of the state change.
         * @return {*}
         */
        setFalse : function() {
            if ( this.b_condition===_u.Condition.VALUES.FALSE ) {
                return this;
            }

            this.__cancelTimer();
            this.b_condition= _u.Condition.VALUES.FALSE;
            this.__emit();

            return this;
        },

        /**
         * Reset this condition.
         * The internal value of this condition will be NOT_SET, which means resetting the condition object.
         * @return {*}
         */
        setNotSet : function() {
            this.b_condition= _u.Condition.VALUES.NOT_SET;
            return this;
        },

        /**
         * Test this condition for _u.Condition.VALUES.TRUE
         * @return {Boolean}
         */
        isTrue : function() {
            return this.b_condition===_u.Condition.VALUES.TRUE;
        },

        /**
         * Test this condition for _u.Condition.VALUES.FALSE
         * @return {Boolean}
         */
        isFalse : function() {
            return this.b_condition===_u.Condition.VALUES.FALSE;
        },

        /**
         * Test this condition for _u.Condition.VALUES.NOT_SET
         * @return {Boolean}
         */
        isNotSet : function() {
            return this.b_condition===_u.Condition.VALUES.NOT_SET;
        },

        /**
         * Register a callback function to be notified whenever the Condition changes state.
         * @param callback {Function({Condition})} a callback function to notify upon Condition state changes.
         * @return {Boolean}
         */
        waitForStateChange : function( callback ) {
            this.signalConditionStateChange.addListener( callback );
            return this;
        },

        /**
         * Register a callback function to be notified whenever the Condition gets _u.Condition.VALUES.TRUE.
         * @param callback {Function({Condition})} a callback function to notify upon Condition state changes.
         * @return {Boolean}
         */
        waitForTrue : function( callback ) {
            if ( this.isTrue() ) {
                _u.schedule(function() {
                    callback(this);
                }, 0);
            } else {
                (function(me, callback) {
                    me.signalConditionStateChange.addListener( function( condition ) {
                        if (condition.isTrue()) {
                            callback( me );
                        }
                    });
                })(this,callback);
            }

            return this;
        },

        /**
         * Register a callback function to be notified whenever the Condition gets _u.Condition.VALUES.FALSE.
         * @param callback {Function({Condition})} a callback function to notify upon Condition state changes.
         * @return {Boolean}
         */
        waitForFalse : function( callback ) {
            if ( this.isFalse() ) {
                _u.schedule(function() {
                    callback(this);
                }, 0);
            } else {
                (function(me, callback) {
                    me.signalConditionStateChange.addListener( function( condition ) {
                        if (condition.isFalse()) {
                            callback( me );
                        }
                    });
                })(this, callback);
            }

            return this;
        },

        /**
         * Set this condition timeout.
         * When the timeout expires, <code>setFalse</code> is called in the condition.
         * @param timeout
         * @return {*}
         */
        setTimeout : function( timeout ) {
            this.timerId= root.setTimeout( this.__timeout.bind(this), timeout );
            return this;
        },

        /**
         * Cancel this Condition internal timeout.
         * @private
         */
        __cancelTimer : function() {
            if (this.timerId) {
                clearTimeout( this.timerId );
                this.timerId= null;
            }
        },

        /**
         * This function is invoked when the Condition is timed out.
         * @private
         */
        __timeout : function() {
            this.setFalse();
            this.timerId= null;
            this.signalTimeout.emit( this );
        },

        /**
         * Reset this function. An alias to setNotSet function which could be misleading.
         * @return {*}
         */
        reset : function() {
            this.setNotSet();
            return this;
        },

        /**
         * Register an observer callback function for timeout events.
         * @param f
         * @return {*}
         */
        waitForTimeout : function( f ) {
            this.signalTimeout.addListener(f);
            return this;
        },

        /**
         * Disable this condition by removing all registered listeners.
         */
        disable : function() {
            this.signalConditionStateChange.removeAllListeners();
            this.signalTimeout.removeAllListeners();
        },

        /**
         * Return this Condition's internal value.
         * @return {*}
         */
        getCurrentValue : function() {
            return this.b_condition;
        }
    };





    /**
     * ConditionTree is the extension of a simple Condition into a full fledged boolean condition tree.
     * A ConditionTree can contain other trees as conditions to form structures like:
     *   A or (B and (C or D))
     *
     * All the base behavior of a simple Condition can be applied to ConditionTree objects.
     *
     * A condition tree applies fast condition short circuit, notifying as soon as possible about condition
     * state changed.
     *
     * @return {*}
     * @constructor
     */
    _u.ConditionTree= function() {
        _u.ConditionTree.superclass.constructor.call(this);
        this.booleanOperator= _u.ConditionTree.BOOLEAN_OPERATOR.AND;
        this.children= [];
        return this;
    };

    /**
     * Enumeration of a ConditionTree children boolean operation.
     * @enum
     * @type {Object}
     */
    _u.ConditionTree.BOOLEAN_OPERATOR= {
        AND : 0,
        OR  : 1
    };

    _u.ConditionTree.prototype= {
        children : null,
        booleanOperator : null,

        /**
         * Set the boolean operator that will be applied to this tree's children.
         * @param op
         * @return {*}
         */
        setBooleanOperator : function(op) {
            this.booleanOperator= op;
            return this;
        },
        /**
         * Find this tree's boolean value making a logical OR with its children.
         * @return {(_u.Condition.VALUES.TRUE | _u.Condition.VALUES.FALSE | _u.Condition.VALUES.NOT_SET)}
         * @private
         */
        __isTrueOr : function() {
            var i, l;
            var ret= _u.Condition.VALUES.NOT_SET;
            var notSet= false;

            for( i= 0, l=this.children.length; i<l; i++ ) {
                if ( this.children[i].isTrue() ) {
                    return _u.Condition.VALUES.TRUE;
                } else  if ( this.children[i].isNotSet() ) {
                    notSet= true;
                }
            }

            return notSet ? _u.Condition.VALUES.NOT_SET : _u.Condition.VALUES.FALSE;
        },

        /**
         * Find this tree's boolen value making a logical AND with its children.
         * @return {(_u.Condition.VALUES.TRUE | _u.Condition.VALUES.FALSE | _u.Condition.VALUES.NOT_SET)}
         * @private
         */
        __isTrueAnd : function() {
            var i, l;
            var notSet= false;

            for( i= 0, l=this.children.length; i<l; i++ ) {
                if ( this.children[i].isFalse() ) {
                    return _u.Condition.VALUES.FALSE;
                } else if ( this.children[i].isNotSet() ) {
                    notSet= true;
                }
            }

            return notSet ? _u.Condition.VALUES.NOT_SET : _u.Condition.VALUES.TRUE;
        },

        /**
         * @return {(_u.Condition.VALUES.TRUE | _u.Condition.VALUES.FALSE | _u.Condition.VALUES.NOT_SET)}
         * @private
         */
        __isTrue : function() {
            var value;

            value= ( this.booleanOperator===_u.ConditionTree.BOOLEAN_OPERATOR.AND ) ?
                this.__isTrueAnd() :
                this.__isTrueOr();

            return value;
        },

        /**
         * Add a new Condition to this ConditionTree.
         * @param condition {_u.Condition | _u.ConditionTree}
         */
        addCondition : function( condition ) {
            this.children.push(condition);
            condition.waitForStateChange( this.__conditionChanged.bind(this) );
            return this;
        },

        /**
         * Invoked when a condition in this tree changes value.
         * @param _u.Condition
         * @private
         */
        __conditionChanged : function(condition) {
            if ( this.isNotSet() ) {
                switch( this.__isTrue() ) {
                    case _u.Condition.VALUES.NOT_SET:
                        break;
                    case _u.Condition.VALUES.TRUE:
                        this.setTrue();
                        break;
                    case _u.Condition.VALUES.FALSE:
                        this.setFalse();
                        break;
                }
            }
        },

        /**
         * Recursively set this condition tree to false.
         */
        reset : function() {
            _u.ConditionTree.superclass.reset.call(this);
            this.children.forEach( function(elem) {
                elem.reset();
            });
        }
    };

    extend( _u.ConditionTree, _u.Condition );




    var ParallelConditionDescriptor= function( fn, condition ) {
        this.condition= condition;
        this.fn= fn;
        return this;
    };

    /**
     *
     * A parallel condition object defines a ConditionTree where each condition is associated with an asynchronous
     * executing function.
     * It expects a list of functions or other ParallelCondition objects to be asynchronously executed.
     * As a ConditionTree, it will short circuit the condition fast to allow your main execution line progress as
     * soon as possible.
     *
     * It inherits all the behavior from ConditionTree and hence from Condition.
     *
     * @param array Array.<{ ( function( _u.Condition, number ) | _u.ParallelCondition) } > array of functions that accept a
     *  _u.Condition and a number (index sequence of paralleled functions).
     * @param timeout {number} millisecond to have the task completed
     */
    _u.ParallelCondition= function( array, timeout ) {

        _u.ParallelCondition.superclass.constructor.call(this);

        this.iterableArray= [];
        this.timeout= timeout || 0;
        this.__setIterableArray(array);

        return this;
    };

    _u.ParallelCondition.prototype= {

        /**
         * Array<ParallelConditionDescriptor>
         */
        iterableArray : null,

        /**
         * Set the internal ConditionTree object.
         * @param array {Array< Function({Condition}) | _u.ParallelCondition >}
         * @private
         */
        __setIterableArray : function( array ) {

            var me= this;
            var iterableArray= [];

            if (array.constructor!==Array ) {
                throw "ParallelCondition needs an Array of functions or other ParallelConditions.";
            }

            array.forEach( function( element, index, array ) {

                var condition;

                if (typeof element === "function") {
                    condition= new _u.Condition();
                    me.addCondition( condition );
                    iterableArray.push( new ParallelConditionDescriptor( element, condition ) );

                } else if (element instanceof _u.ParallelCondition ) {
                    condition= element;
                    me.addCondition( condition );
                    iterableArray.push( new ParallelConditionDescriptor( function() {
                        element.execute();
                    }, condition ) );

                } else {
                    throw new Error("ParallelCondition needs functions or other ParallelCondition as parameters.");
                }
            });

            this.iterableArray= iterableArray;
        },

        /**
         * Start the asynchronous condition evaluation.
         * This function will notify any registered observer via:
         *
         * <code>waitForTrue</code>
         * <code>waitForFalse</code>
         * <code>waitForStateChange</code>
         * <code>waitForTimeout</code>
         */
        execute : function() {

            if ( this.timeout>0 ) {
                this.setTimeout( this.timeout );
            }

            // element is supposed to be a function that receives as parameters:
            // + _u.Condition object
            // + Number as the index sequence of the paralleled functions
            this.iterableArray._forEachP();
        }

    };

    extend( _u.ParallelCondition, _u.ConditionTree );





    /**
     * Future objects are holders for values of functions not yet executed.
     * Futures have stateful semantics and their values can be set only once.
     *
     * Futures expect value observers to register via a call to <code>waitForValueSet</code>.
     *
     * If you want to test for a valid value in the Future object, a call to <code>isValueSet</code> must
     * be performed to know whether a value has been set, followed by a call to <code>getValue</code> which
     * will return the actual value set in this Future object.
     *
     * @return {*}
     * @constructor
     */
    _u.Future = function() {
        this.valueSetCondition= new _u.Condition();
        return this;
    };

    _u.Future.prototype = {

        /**
         * Actual value for this future.
         */
        value : undefined,

        /**
         * Internal Condition object
         */
        valueSetCondition : null,

        /**
         * Return this Future object's value.
         * If calling this method, a call to <code>isValueSet</code> must be performed to know whether the Future
         * has had a value set.
         *
         * @return {*}
         */
        getValue : function() {
            return this.value;
        },

        /**
         * Test internal Condition object to know whether a value has been set in the Future object.
         * @return {Boolean}
         */
        isValueSet : function() {
            return this.valueSetCondition.isTrue();
        },

        /**
         * Set this Future object's value and notify any registered observers.
         * @param v {Object}
         */
        setValue : function( v ) {
            if ( !this.valueSetCondition.isTrue() ) {
                this.value= v;
                this.valueSetCondition.setTrue();
            }
        },

        /**
         * Register a callback function as observer for this Future object's set value event.
         * @param callback {Function({Object})}
         * @return {*}
         */
        waitForValueSet : function( callback ) {

            var me= this;

            if ( this.valueSetCondition.isTrue() ) {
                _u.schedule( function() {
                    callback(me);
                } );
            }

            this.valueSetCondition.waitForTrue( callback.bind(null,this) );
            return this;
        }
    };





    /**
     * This class is for internal use of a Dispatcher/Pool object.
     *
     * The task object is expected to be a function receiving a <code>_u.Future</code> object,
     * but it may be a closure which behaves distinctly depending on the function called in the
     * <code>_u.Dispatcher</code> object.
     *
     * A chained call, may be interrupted by external events:
     *
     * + if a timeout event is generated, the function execution will stop and the _u.WorkerTask disabled (no condition
     *   or callback notification). The worker will be killed, and a new one will be created.
     * + if one function in the chain sets the Future's parameter to an Error instance, the chain call will stop
     *   and the worker will be reused.
     *
     *
     * @param task {function( _u.Future}
     * @param timeout {number}
     * @return {*}
     * @constructor
     */
    _u.WorkerTask = function( task, timeout ) {

        this.timeout= timeout;
        this.future= new _u.Future();
        this.task= task;

        return this;
    };

    _u.WorkerTask.prototype = {

        task : null,
        future : null,
        timeout : 0,

        getTask : function() {
            return this.task;
        },

        getTimeout : function() {
            return this.timeout;
        },

        getFuture : function() {
            return this.future;
        }
    };




    var __workerIndex= 0;
    /**
     * A Worker is the heart of Dispatcher and Pool objects.
     * It keeps all the logic needed to execute asynchronous tasks, timeout them, and all the mechanics for
     * notifying about its internal activity:
     *
     * <li>is busy executing an asynchronous function
     * <li>is timed out. Timeout is just a notification, since the running asynchronous function can't be cancelled.
     *
     * @return {*}
     * @constructor
     */
    _u.Worker= function() {
        this.id= "worker"+__workerIndex++;

        this.workingCondition= new _u.Condition();
        this.timeoutCondition= new _u.Condition();

        return this;
    };

    _u.Worker.prototype= {

        /**
         * Worker id. By default "worker"+__index
         * @type {*}
         */
        id : null,

        /**
         * Condition which informs about worker busy status.
         * @type _u.Condition
         */
        workingCondition : null,

        /**
         * Condition which informs about worker timeout status.
         * @type _u.Condition
         */
        timeoutCondition : null,

        /**
         * currently executing task
         * @type _u.WorkerTask
         */
        currentWorkerTask : null,

        /**
         * Execute an asynchronous task and optionally, within the specified time.
         *
         * @param workerTask {_u.WorkerTask} an asynchronous task descriptor.
         */
        run : function( workerTask ) {

            var future= workerTask.getFuture();

            this.currentWorkerTask= workerTask;
            this.workingCondition.setTrue();

            // schedule
            (function(me, future, timeout) {

                var timeoutId= null;

                root.setTimeout( function() {
                    // cambia la condicion de working cuando se establece valor al _u.Future
                    future.waitForValueSet( function() {
                        me.workingCondition.setFalse();
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                    });

                    workerTask.getTask()( future );

                }, 0 );

                if (timeout) {
                    timeoutId= root.setTimeout( function() {
                        me.timeoutCondition.setTrue();
                        timeoutId= null;
                    }, timeout );
                }

            })(this, future, workerTask.getTimeout());

        },

        /**
         *
         * @return {Boolean} is this Worker executing an asynchronous function ?
         */
        isWorking : function() {
            return this.workingCondition.isTrue();
        },

        /**
         *
         * @return {Boolean} is this worker is timed out ?
         */
        isTimedOut : function() {
            return this.timeoutCondition.isTrue();
        },

        /**
         * Register an observer for worker-ends-execution event.
         * @param f {function( _u.Condition )} a callback function which will be notified when the worker ends.
         * @return {*}
         */
        waitForWorkDone : function( f ) {
            this.workingCondition.waitForFalse(f);
            return this;
        },

        /**
         * Register an observer for worker-times-out event.
         * @param f {function( _u.Condition ) } a callback function which will be notified when the worker ends.
         * @return {*}
         */
        waitForTimeout : function( f ) {
            this.timeoutCondition.waitForTrue(f);
            return this;
        },

        /**
         * When the worker times out, a Dispatcher or Pool will mark a worker as invalid, and then Kill it,
         * preventing from notifying results from the asynchronous function is being performed.
         * @protected
         */
        kill : function() {
            console.warn("Worker '"+this.id+"' timeout. Future value as Error.");
            this.currentWorkerTask.getFuture().setValue( new Error("Worker '"+this.id+"' Timeout") );
            this.workingCondition.disable();
            this.timeoutCondition.disable();
        }
    };






    /**
     * Create the number of workers specified in the constructor.
     * Only called from the constructor.
     *
     * @private
     */
    function __createWorkers(dispatcher, concurrency) {
        var workers= [];
        for( var i=0; i<concurrency; i++ ) {
            var worker= __createWorker(dispatcher);
            workers.push( worker );
        }

        return workers;
    }

    /**
     * Helper to create
     * @return {_u.Worker}
     * @private
     */
    function __createWorker( dispatcher ) {
        var worker= new _u.Worker();
        worker.waitForWorkDone( dispatcher.__workerNotBusy.bind(dispatcher, worker) );
        worker.waitForTimeout( dispatcher.__workerTimedOut.bind(dispatcher, worker) );

        return worker;
    }

    /**
     * A Dispatcher object sequences the execution of tasks. Internally allocates a predefined number of
     * _u.Worker instances to handle the submitted asynchronous tasks.
     * Each task can be submitted with its own timeout control.
     *
     * The Dispatcher will handle a list of submitted tasks and the specified number of _u.Worker objects
     * in an attempt to sequentially execute tasks.
     * If more than one worker is specified in the constructor, there's no sequential execution guarantee
     * since the workers will have allocated tasks on demand.
     *
     * When one worker expires, the Dispatcher simply creates a new one and kills expired Workers's observers.
     *
     * @param concurrency {number} of active Worker objects. Defaults to 1.
     * @return {*}
     * @constructor
     */
    _u.Dispatcher = function( concurrency ) {
        this.concurrency= concurrency || 1;
        this.workers= __createWorkers(this,this.concurrency);
        this.pendingTasks = [];
        this.isEmptySignal= new _u.Signal();
        return this;
    };

    _u.Dispatcher.prototype= {

        /**
         * {number} of workers
         */
        concurrency : 1,

        /**
         * @type {Array<_u.Worker>} initialization workers.
         */
        workers : null,          // _u.Worker

        /**
         * @type {Array<_u.WorkerTask>} pending tasks blocking queue.
         */
        pendingTasks : null,    // collection of _u.WorkerTask

        /**
         * @type {_u.Signal} notifying about no more tasks to execute.
         */
        isEmptySignal : null,

        /**
         * Submit a task for asynchronous execution.
         *
         * @param _task { ( function( _u.Future ) | Array.<function( _u.Future, Object )> ) }
         * @param _timeout {number=} millisecond to consider this task timed out.
         * @return {_u.Future}
         */
        submit : function( _task, _timeout ) {

            var task= new _u.WorkerTask( _task, _timeout );
            this.pendingTasks.push( task );
            this.__executeTask();

            return task.getFuture();
        },

        submitNodeSequence : function( _task, _timeout, haltOnError ) {

            if (typeof haltOnError==='undefined') {
                haltOnError= true;
            }
            var task;

            if ( Object.prototype.toString.call( _task ) === '[object Array]' ) {

                // trivial.
                // an empty array has been set.
                if ( _task.length===0 ) {
                    task= function(future) {
                        future.setValue(true);
                    }
                } else {

                    task= function(future) {

                        var pendingTasks= Array.prototype.slice.call( _task );

                        function iterate() {
/**
                            if (pendingTasks.length===0) {
                                if (arguments[0]) {
                                    future.setValue(arguments[0]);
                                }
                                return;
                            }
*/
                            var fn= pendingTasks.shift();
                            var retValue;

                            try {
                                retValue= fn.apply( iterate, arguments );
                                if (retValue && pendingTasks.length) {
                                    iterate(undefined, retValue);
                                }
                                if (pendingTasks.length===0) {
                                    future.setValue(retValue);
                                }
                            } catch(e) {
                                if (haltOnError) {
                                    future.setValue(e);
                                } else {
                                    iterate(e);
                                }
                            }





                        }

                        iterate();

                    }
                }
            } else {
                task= _task;
            }

            return this.submit( task, _timeout );
        },

        /**
         * Submit an array of tasks for asynchronous execution.
         * Tasks will be sequentially executed.
         * Each function accepts two parameter: an error Condition object which will halt serie execution if has
         * a value set. And an arbitrary object which is the return value from the previous executing function.
         * @param _task
         * @param _timeout
         */
        submitChained : function( _task, _timeout ) {

            var task;

            if ( Object.prototype.toString.call( _task ) === '[object Array]' ) {

                // trivial.
                // an empty array has been set.
                if ( _task.length===0 ) {
                    task= function(future) {
                        future.setValue(true);
                    }
                } else {

                    task= function(future) {

                         var index= 0;

                         function iterate(initialValue) {

                             var chain= new _u.Future();
                             chain.waitForValueSet( function(f) {
                                 if ( f.isValueSet() && f.getValue() instanceof Error ) {
                                     if (!future.isValueSet()) {
                                         console.warn("Dispatcher chain errored. Reason: '"+f.getValue()+"'");
                                         future.setValue( f.getValue() );
                                     }
                                 } else {
                                     index++;
                                     if ( index===_task.length ) {
                                         future.setValue(f.getValue());
                                     } else {
                                         if (future.isValueSet()) {
                                             // some external event, like a timeout, has triggered this task's Future
                                             // object value.
                                             console.warn("Dispatcher chain call interrupted: '"+future.getValue()+"'");
                                         } else {

                                             // reschedule next part of the function chain, and pass along
                                             // last function's return value as next function's parameter.
                                             _u.schedule( iterate(f.getValue()), 0 );
                                         }
                                     }
                                 }
                             });

                             _task[index](chain, initialValue);

                         }

                         iterate(undefined);
                    }
                }
            } else {
                task= _task;
            }

            return this.submit( task, _timeout );

        },

        /**
         * Register a function as observer for Dispatcher lazy event.
         * @param l { function( _u.Condition )}
         * @return {*}
         */
        addIsEmptyListener : function( l ) {
            this.isEmptySignal.addListener(l);
            return this;
        },

        /**
         * Execute a queued task.
         * Tasks are processed FIFO.
         *
         * @private
         */
        __executeTask : function() {

            if ( this.pendingTasks.length && this.workers.length ) {
                var task= this.pendingTasks.shift();
                var worker= this.workers.shift();
                worker.run( task );
            }

            if ( !this.pendingTasks.length ) {
                this.isEmptySignal.emit( this );
            }
        },

        /**
         * Internally notified when a worker ends executing its assigned task.
         * @param worker {_u.Worker}
         * @private
         */
        __workerNotBusy : function( worker ) {
            if (!worker.isTimedOut() ) {
                this.workers.push( worker );
            } else {
                this.workers.push( __createWorker(this) );
            }
            this.__executeTask();
        },

        /**
         * Internally notified when a worker times out.
         * @param worker {_u.Worker}
         * @private
         */
        __workerTimedOut : function( worker ) {
            worker.kill();
            this.__executeTask();
        }
    };




    if (typeof define!=='undefined' && define.amd) {              // AMD / RequireJS
        define('async', [], function () {
            return _u;
        });

    } else if (typeof module!=='undefined' && module.exports) {     // Node.js
        module.exports= _u;

    } else {
        root._u= _u;

    }

})(typeof window!=='undefined' ? window : global);
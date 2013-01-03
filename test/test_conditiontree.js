var _u= require('../untangle');
var assert= require('assert');

function waitForTrue(condition) {
    console.log( "Condition '"+condition.getId()+"' is true.");
}
function waitForFalse(condition) {
    console.log( "Condition '"+condition.getId()+"' is false.");
}

var condition1= new _u.Condition().setId("c1");
var condition2= new _u.Condition().setId("c2");

var conditiontree1= new _u.ConditionTree().
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.OR ).
    addCondition( condition1 ).
    addCondition( condition2 ).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 1");

condition1.setFalse();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.NOT_SET );
condition2.setFalse();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.FALSE );

conditiontree1.reset();
condition1.setFalse();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.NOT_SET );
condition2.setTrue();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.TRUE );

conditiontree1.reset();
condition1.setTrue();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.TRUE );
condition2.setFalse();

conditiontree1.reset();
condition1.setTrue();
assert.strictEqual( conditiontree1.getCurrentValue(), _u.Condition.VALUES.TRUE );
condition2.setTrue();



console.log("\nTesting 2");
var condition3= new _u.Condition().setId("c3");
var condition4= new _u.Condition().setId("c4");

var conditiontree2= new _u.ConditionTree().
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.AND ).
    addCondition( condition3 ).
    addCondition( condition4).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 2");

condition3.setFalse();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.FALSE );
condition4.setFalse();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.FALSE );

conditiontree2.reset();
condition3.setFalse();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.FALSE );
condition4.setTrue();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.FALSE );

conditiontree2.reset();
condition3.setTrue();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.NOT_SET );
condition4.setFalse();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.FALSE );

conditiontree2.reset();
condition3.setTrue();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.NOT_SET );
condition4.setTrue();
assert.strictEqual( conditiontree2.getCurrentValue(), _u.Condition.VALUES.TRUE );



conditiontree1.reset();
conditiontree2.reset();

console.log("\nTesting 3");
//
// conditiontree3 is ( c1 || c2 ) && ( c3 && c4 )
var conditiontree3= new _u.ConditionTree().
    addCondition( conditiontree1 ).
    addCondition( conditiontree2 ).
    setBooleanOperator( _u.ConditionTree.BOOLEAN_OPERATOR.AND ).
    waitForTrue( waitForTrue).
    waitForFalse( waitForFalse).
    setId("condition tree 3");

// renders 'condition tree 1' as NotSet
condition1.setFalse();
assert.strictEqual( conditiontree3.getCurrentValue(), _u.Condition.VALUES.NOT_SET );
// renders 'condition tree 2' as False, and thus 'condition tree 3' as false too.
condition3.setFalse();
assert.strictEqual( conditiontree3.getCurrentValue(), _u.Condition.VALUES.FALSE );

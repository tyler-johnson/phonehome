var test = require("tape");
var PhoneHome = require("../");

function createPhone() {
	return new PhoneHome({ home: true });
}

test("adds a method", function(t) {
	t.plan(2);
	var phone = createPhone();

	t.notOk(phone.has("test"), "doesn't have method before its added");
	phone.methods({ test: function(){} });
	t.ok(phone.has("test"), "has method after its added");
});

test("throws error when overwriting an exising method", function(t) {
	t.plan(1);
	var phone = createPhone();
	phone.methods({ test: function(){} });

	t.throws(function() {
		phone.methods({ test: function(){} });
	}, /already exists/, "threw an error");
});

test("throws error when attempting to add a non-function method", function(t) {
	t.plan(5);
	var phone = createPhone();

	function testThrow(v, m) {
		t.throws(function() {
			phone.methods({ test: v });
		}, /expecting function/i, m);
	}

	testThrow(null, "doesn't accept null");
	testThrow(void 0, "doesn't accept undefined");
	testThrow("hello", "doesn't accept a string");
	testThrow(12345, "doesn't accept a number");
	testThrow([], "doesn't accept an object");
});

var test = require("tape");
var PhoneHome = require("../");

module.exports = function(phone) {

	test("is a phone?", function(t) {
		t.ok(phone instanceof PhoneHome, "is a phone.");
	});



};

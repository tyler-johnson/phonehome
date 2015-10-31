// var test = require("tape");

var PhoneHome = require("./");

var phone = new PhoneHome({
	simulate: true
});

console.log("trusted?", phone.trusted);

phone.methods({
	test: function() {
		console.log("simulated?", this.isSimulation);
		return "blammo";
	}
});

phone.call("test", 0, true, "howdy").finally(function() {
	console.log("test");
});

phone.call("another").finally(function() {
	console.log("another");
});

phone.apply("nowait", { wait: false }).finally(function() {
	console.log("nowait");
});

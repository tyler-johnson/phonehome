// var test = require("tape");

var PhoneHome = require("./");

var phone = new PhoneHome({
	simulate: true,
	url: "/phone"
});

console.log("home?", phone.isHome);

phone.methods({
	test: function() {
		console.log("simulated?", this.isSimulation);
		console.log(this.user);
		return "blammo";
	}
});

phone.call("test", 0, true, "howdy", function(err, res) {
	if (err) console.log("test error: %s", err.toString());
	else console.log("test", res);
});

phone.apply("another", [{ foo: "bar" }]).then(function(res) {
	console.log("another", res);
}, function(e) {
	console.log("another error: %s", e.toString());
});

if (!process.browser) {
	var express = require("express");
	var app = express();
	var bundle = require("browserify")(__filename, {
		debug: true
	})
	.ignore("browserify")
	.ignore('serve-script')
	.ignore("body-parser")
	.ignore("express");

	app.use(require("body-parser").json());
	app.use("/phone", phone.http({
		mixin: function() {
			return { user: { name: "boo" } };
		}
	}));
	app.use(require('serve-script')({
		src: function(done) {
			done(null, bundle.bundle());
		},
		noConsole: true
	}));

	app.listen(3000);
}

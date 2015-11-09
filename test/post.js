var _ = require("underscore");
var homeTests = require("./home");
var PhoneHome = require("../");

function createPhone(options) {
	return new PhoneHome(_.extend({
		request: PhoneHome.Post.request
	}, options));
}

homeTests(createPhone());

import Bluebird from "bluebird";
import request from "request";

export default function POSTRequest(name, args) {
	var url = this.options.url || "/";

	return Bluebird.fromCallback(function(cb) {
		request({
			url: url,
			method: "POST",
			json: true,
			body: args
		}, cb);
	}, {
		multiArgs: true
	}).spread(function(resp, body) {
		console.log(body);
	// 	return this._parseMethodArgument(body, options.transform);
	// }, function(err) {
	// 	if (!(err instanceof Error)) {
	// 		if (_.isObject(err)) {
	// 			var klass = Error;
	// 			if (err.name && typeof global[err.name] === "function") klass = global[err.name];
	// 			err = _.extend(new klass(), err);
	// 		} else if (_.isString(err)) {
	// 			err = new Error(err);
	// 		}
	// 	}
	//
	// 	throw err;
	});
}

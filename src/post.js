import http from "http";
import Url from "url";
import contentType from "content-type";
import PhoneError from "./error";
import {json as jsonParser} from "body-parser";
import {confusedAsync} from "./utils";

var post;

if (typeof XMLHttpRequest !== "undefined") {
	post = function(url, data) {
		return new Promise(function(resolve, reject) {
			let req = new XMLHttpRequest();

			req.addEventListener("load", function() {
				resolve(req.response);
			});

			req.addEventListener("error", reject);

			req.open("POST", url);
			req.setRequestHeader("Content-Type", "application/json");
			req.responseType = "json";
			req.send(JSON.stringify(data));
		});
	};
} else {
	post = function(url, data) {
		return new Promise(function(resolve, reject) {
			let opts = Url.parse(url);
			opts.method = "POST";

			let req = http.request(opts, function(resp) {
				resp.setEncoding("utf-8");
				let result = "";

				resp.on("data", function(c) {
					result += c;
				});

				resp.on("end", function() {
					let type = contentType.parse(resp.headers["content-type"] || "");

					if (type && type.type === "application/json") {
						resolve(JSON.parse(result));
					} else {
						resolve(result);
					}
				});

				resp.on("error", reject);
			});

			req.on("error", reject);
			req.setHeader("Content-Type", "application/json");
			req.end(JSON.stringify(data));
		});
	};
}

export function request(name, args, options) {
	options = Object.assign({ url: "/" }, this.options, options);
	let u = typeof options.url !== "function" ? options.url :
		options.url.call(this, name, args, options);

	// make the post request
	return post(u, {
		name: name,
		arguments: args
	})

	// transform the result before returning it
	.then((result) => {
		if (typeof options.transform === "function") {
			return confusedAsync(options.transform, this, [ result ]);
		}

		return result;
	})

	// look for errors
	.then(function(data) {
		if (data && data.error) {
			let klass = PhoneError;
			if (data.name && typeof global[data.name] === "function") klass = global[data.name];
			throw Object.assign(new klass(), data);
		}

		return data;
	});
}

export function responder(phone, options) {
	options = options || {};
	let parser = jsonParser();

	return function(req, res, next) {
		if (req.method !== "POST") {
			if (typeof next === "function") return next();
			send(500, { message: "Expecting POST request." });
		}

		function send(status, data) {
			// something else is probably handling this response
			if (res.headersSent) return;

			res.statusCode = status;

			if (typeof res.json === "function") {
				res.json(data);
			} else {
				let body = JSON.stringify(data);
				res.setHeader("Content-Type", "application/json");
				res.setHeader("Content-Length", body.length);
				res.end(body);
			}
		}

		// parse the body as JSON
		new Promise(function(resolve, reject) {
			parser(req, res, function(err) {
				if (err) reject(err);
				else resolve();
			});
		})

		// mixin user request details
		.then(function() {
			if (typeof options.mixin === "function") {
				return confusedAsync(options.mixin, phone, [ req ]);
			}

			return options.mixin;
		})

		// run the method
		.then(function(mixin) {
			let data = req.body || {};

			return phone.apply(data.name, data.arguments, {
				mixin: Object.assign({
					request: req,
					response: res
				}, mixin)
			});
		})

		// transform the result before sending it back
		.then(function(result) {
			if (typeof options.transform === "function") {
				return confusedAsync(options.transform, phone, [ result, res ]);
			}

			return result;
		})

		// send the result, handle errors
		.then(function(resp) {
			send(200, resp);
		}).catch(function(e) {
			if (e instanceof PhoneError) send(e.status, e);
			else {
				send(500, new PhoneError(500, "Internal Server Error"));
				phone.emit("error", e);
			}
		});
	};
}

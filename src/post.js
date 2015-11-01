import http from "http";
import Url from "url";
import contentType from "content-type";
import PhoneError from "./error";
import {json as jsonParser} from "body-parser";

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

export function request(name, args) {
	let self = this;
	let url = this.options.url || "/";
	let u = typeof url === "function" ? url.call(self, name, args) : url;

	return post(u, {
		name: name,
		arguments: args
	}).then(function(data) {
		if (data && data.error) {
			let klass = PhoneError;
			if (data.name && typeof global[data.name] === "function") klass = global[data.name];
			throw Object.assign(new klass(), data);
		}

		return data;
	});
}

export function responder(phone) {
	let parser = jsonParser();

	return function(req, res) {
		function send(status, data) {
			let body = JSON.stringify(data);
			res.statusCode = status;
			res.setHeader("Content-Type", "application/json");
			res.setHeader("Content-Length", body.length);
			res.end(body);
		}

		new Promise(function(resolve, reject) {
			parser(req, res, function(err) {
				if (err) reject(err);
				else resolve();
			});
		}).then(function() {
			let data = req.body || {};
			return phone.apply(data.name, data.arguments, {
				mixin: {
					request: req,
					response: res
				}
			});
		}).then(function(resp) {
			send(200, resp);
		}).catch(function(e) {
			if (e instanceof PhoneError) send(e.status, e);
			else {
				send(500, {
					message: "Internal Server Error"
				});
				phone.emit("error", e);
			}
		});
	};
}

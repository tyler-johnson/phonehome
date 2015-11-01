import * as Post from "./post";
import PhoneError from "./error";
import {EventEmitter} from "events";

export default class PhoneHome extends EventEmitter {
	constructor(options) {
		super();
		options = options || {};

		// no max listeners
		this.setMaxListeners(0);

		// internal state
		this.s = {
			// holds the methods
			methods: [],
			// whether this is a trusted connection
			trusted: typeof options.trusted === "boolean" ? options.trusted : typeof window === "undefined",
			// whether or nor untrusted clients will simulate a method
			simulate: options.simulate == null ? false : options.simulate,
			// method to call for remote operations
			request: options.request != null ? options.request : Post.request
		};

		// user options, for the request method
		this.options = options;
	}

	get trusted() { return this.s.trusted; }

	has(name) {
		return Boolean(this.s.methods[name]);
	}

	methods(name, options, fn) {
		if (typeof name === "object") {
			Object.keys(name).forEach(n => this.methods(n, name[n]));
			return this;
		}

		if (typeof options === "function") [fn, options] = [options, null];
		if (typeof name !== "string" || name === "") {
			throw new PhoneError("Expecting non-empty string for name of method.");
		}

		if (typeof fn !== "function") {
			throw new PhoneError("Expecting function for method.");
		}

		if (name in this.s.methods) {
			throw new PhoneError("Method " + name + " already exists and cannot be overridden.");
		}

		this.s.methods[name] = {
			name: name,
			fn: fn,
			options: options || {}
		};

		return this;
	}

	call(name) {
		var done;
		var args = Array.prototype.slice.call(arguments, 1);

		if (args.length && typeof args[args.length - 1] === "function") {
			done = args.pop();
		}

		return this.apply(name, args, done);
	}

	apply(name, args, options, cb) {
		if (typeof name !== "string" || name === "") {
			return Promise.reject(new PhoneError("Missing method name."));
		}

		if (typeof args === "function") [cb, args] = [args, null];
		if (typeof options === "function") [cb, options] = [options, null];

		options = options || {};
		args = Array.isArray(args) ? args.slice(0) : args != null ? [ args ] : [];

		// untrusted code phones home
		if (!this.trusted) {
			let remote, local, sim;
			sim = options.simulate != null ? options.simulate : this.s.simulate;
			remote = this._request(name, args, options);

			// execute as a simulation if the method exists locally
			if (this.has(name) && sim) {
				local = this._exec(name, args, options.mixin);

				if (typeof options.onDelivery === "function") {
					remote.then(options.onDelivery);
				}

				if (typeof options.onError === "function") {
					remote.then(options.onError);
				}

				return local;
			}

			return remote;
		}

		// trusted clients do a normal execution
		return this._exec(name, args, options.mixin);
	}

	_request(name, args) {
		let req = this.s.request;
		if (typeof req !== "function") {
			return Promise.reject(new PhoneError("Missing request method to call home with."));
		}

		if (req.length > 2) {
			return new Promise((resolve, reject) => {
				req.call(this, name, args, function(err, resp) {
					if (err != null) reject(err);
					else resolve(resp);
				});
			});
		} else {
			return Promise.resolve(req.call(this, name, args));
		}
	}

	_exec(name, args, mixin) {
		// get the method
		var method = this.s.methods[name];
		if (!method) {
			return Promise.reject(new PhoneError("No method '" + name + "' defined."));
		}

		// create the request object
		var req = Object.assign({}, mixin, {
			phone: this,
			name: name,
			arguments: args,
			isSimulation: !this.trusted,
			options: method.options || {}
		});

		// switches to callback based async
		var result, done;
		req.async = function() {
			var good, bad;
			if (!done) {
				result = new Promise((g, b) => [good,bad] = [g,b]);
				done = (e, r) => e ? bad(e) : good(r);
			}
			return done;
		};

		// run the method and return the result
		var syncResult = method.fn.apply(req, args);
		if (result == null) result = syncResult;
		return Promise.resolve(result);
	}

	http() {
		return Post.responder(this);
	}
}

PhoneHome.Error = PhoneError;
PhoneHome.request = Post.request;

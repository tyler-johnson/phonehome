import hasOwn from "has-own-prop";
import Bluebird from "bluebird";
import POSTRequest from "./post";

export default class PhoneHome {
	constructor(options) {
		options = options || {};

		// internal state
		this.s = {
			// holds the methods
			methods: [],
			// whether this is a trusted connection
			trusted: typeof options.trusted === "boolean" ? options.trusted : !process.browser,
			// whether or nor untrusted clients will simulate a method
			simulate: options.simulate == null ? false : options.simulate,
			// queued calls to home
			calls: [],
			// method to call for remote operations
			request: options.request != null ? options.request : POSTRequest
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
			throw new Error("Expecting non-empty string for name of method.");
		}

		if (typeof fn !== "function") {
			throw new Error("Expecting function for method.");
		}

		if (hasOwn(this.s.methods, name)) {
			throw new Error("Method " + name + " already exists and cannot be overridden.");
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
			return Bluebird.reject(new Error("Missing method name."));
		}

		if (typeof args === "function") [cb, args] = [args, null];
		if (typeof options === "function") [cb, options] = [options, null];

		options = options || {};
		args = Array.isArray(args) ? args.slice(0) : args != null ? [ args ] : [];
		let remote, local;

		// untrusted code phones home
		if (!this.trusted) {
			remote = options.wait ? this._queue(name, args) : this._request(name, args);
		}

		// execute locally
		// the client will run this as a simulation and the result is eaten
		local = this._exec(name, args, options.mixin).catch(e => {
			if (!this.trusted) this.trigger("error", e);
			else throw e;
		});

		return remote || local;
	}

	_request(name, args) {
		let req = this.s.request;
		if (typeof req !== "function") {
			throw new Error("Missing request method to call home with.");
		}

		if (req.length > 2) {
			return Bluebird.fromCallback(function(cb) {
				req.call(this, name, args, cb);
			}).bind(this);
		} else {
			return Bluebird.cast(req.call(this, name, args)).bind(this);
		}
	}

	_queue(name, args) {
		let promise, resolve, reject;
		promise = new Bluebird(function(r1, r2) {
			[resolve,reject] = [r1,r2];
		}).bind(this);

		this.s.calls.push({ name, args, promise, resolve, reject });
		this._attemptCall();

		return promise;
	}

	_attemptCall() {
		// don't call if currently calling
		if (this.s.calling) return false;

		// if there are no calls, resolve immediately
		if (!this.s.calls.length) return false;

		// phone home and resolve the call
		var call = this.s.calls.shift();
		this._request(call.name, call.args).nodeify(function(err, resp) {
			if (err) call.reject(err);
			else call.resolve(resp);

			// attempt another call when finished
			this._attemptCall();
		});

		return true;
	}

	_exec(name, args, mixin) {
		// don't simulate if specified
		if (!this.trusted && !this.s.simulate) return Bluebird.bind(this);

		// get the method
		var method = this.s.methods[name];
		if (!method) {
			// clients just exit since the method is also run remotely
			if (!this.trusted) return Bluebird.bind(this);
			return Bluebird.reject(new Error("No method '" + name + "' defined.")).bind(this);
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
				result = new Bluebird((g, b) => [good,bad] = [g,b]);
				done = (e, r) => e ? bad(e) : good(r);
			}
			return done;
		};

		// run the method and return the result
		var syncResult = method.fn.apply(req, args);
		if (result == null) result = syncResult;
		return Bluebird.cast(result).bind(this);
	}
}

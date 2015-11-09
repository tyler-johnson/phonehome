import * as Post from "./post";
import PhoneError from "./error";
import {EventEmitter} from "events";
import {confusedAsync, callbackify} from "./utils";

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
			// whether this is a home connection
			home: typeof options.home === "boolean" ? options.home : typeof window === "undefined",
			// whether or nor unhome clients will simulate a method
			simulate: options.simulate == null ? false : options.simulate,
			// method to call for remote operations
			request: options.request != null ? options.request : Post.request
		};

		// user options, for the request method
		this.options = options;
	}

	get isHome() { return this.s.home; }

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
		let done;
		let args = Array.prototype.slice.call(arguments, 1);

		if (args.length && typeof args[args.length - 1] === "function") {
			done = args.pop();
		}

		return this.apply(name, args, done);
	}

	apply(name, args, options, cb) {
		if (typeof name !== "string" || name === "") {
			return Promise.reject(new PhoneError("Missing method name."));
		}

		// apply(name, cb)
		if (typeof args === "function" && options == null && cb == null) {
			[cb, args] = [args, []];
		}

		// apply(name)
		// apply(name, args)
		// apply(name, args, cb)
		// apply(name, options)
		// apply(name, options, cb)
		if (args == null || typeof args === "object") {
			if (typeof options === "function" && cb == null) {
				[cb,options] = [options,null];
			}

			if (options == null) {
				if (Array.isArray(args)) options = null;
				else [options, args] = [args, []];
			}
		}

		if (!Array.isArray(args)) {
			return Promise.reject(new Error("Arguments must be an array."));
		}

		options = options || {};

		// get the method
		let method = this.s.methods[name];
		if (!method) {
			return Promise.reject(new PhoneError("No method '" + name + "' defined."));
		}

		// code thats not at home needs to phone home
		if (!this.isHome) {
			let remote, local, sim;
			sim = method.options.simulate != null ? method.options.simulate : this.s.simulate;
			remote = this._request(name, args, options);

			// execute as a simulation if the method exists locally
			if (sim && this.has(name)) {
				local = this._exec(method, args, options.mixin);
				local.remote = remote;
				return callbackify(local, cb);
			}

			return callbackify(remote, cb);
		}

		// home clients do a normal execution
		return callbackify(this._exec(method, args, options.mixin), cb);
	}

	_request(name, args, options) {
		let req = this.s.request;
		if (typeof req !== "function") {
			return Promise.reject(new PhoneError("Missing request method to call home with."));
		}

		return confusedAsync(req, this, [ name, args, options ]);
	}

	_exec(method, args, mixin) {
		// create the request object
		let req = Object.assign({}, mixin, {
			phone: this,
			name: method.name,
			arguments: args,
			isSimulation: !this.isHome,
			options: method.options || {}
		});

		// switches to callback based async
		let result, done;
		req.async = function() {
			let good, bad;
			if (!done) {
				result = new Promise((g, b) => [good,bad] = [g,b]);
				done = (e, r) => e ? bad(e) : good(r);
			}
			return done;
		};

		// run the method and return the result
		let syncResult = method.fn.apply(req, args);
		if (result == null) result = syncResult;
		return Promise.resolve(result);
	}

	http(opts) {
		return Post.responder(this, opts);
	}
}

PhoneHome.Error = PhoneError;
PhoneHome.Post = Post;
PhoneHome.request = Post.request;
PhoneHome.responder = Post.responder;

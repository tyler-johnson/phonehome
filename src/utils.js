
// for methods that we don't know if they are callback or promise async
export function confusedAsync(fn, ctx, args) {
	if (fn.length > args.length) {
		return new Promise(function(resolve, reject) {
			fn.apply(ctx, args.concat(function(err, r) {
				if (err) reject(err);
				else resolve(r);
			}));
		});
	} else {
		return Promise.resolve(fn.apply(ctx, args));
	}
}

// turns a promise into a callback
export function callbackify(promise, cb) {
	if (typeof cb === "function") {
		promise.then(function(r) {
			cb(null, r);
		}, function(e) {
			cb(e);
		});
	}

	// return original promise
	return promise;
}

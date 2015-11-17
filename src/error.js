import isPlainObject from "is-plain-object";

export default class PhoneError extends Error {
	constructor(status, message) {
		let related, obj;
		if (typeof status !== "number") [message,status] = [status,400];

		if (message instanceof Error) {
			related = message;
			message = related.message;
		}

		else if (isPlainObject(message)) {
			obj = message;
			message = obj.message;
		}

		super(message);

		if (obj) {
			Object.assign(this, obj);
		} else {
			if (related) this.related = related;
			this.message = message;
			this.status = status;
		}
	}

	get name() { return "PhoneError"; }

	toJSON() {
		return {
			error: true,
			message: this.message,
			status: this.status
		};
	}

	toString() {
		return "PhoneError [" + this.status + "]: " + this.message;
	}
}

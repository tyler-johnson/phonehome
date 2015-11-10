export default class PhoneError extends Error {
	constructor(status, message) {
		let related;
		if (typeof status !== "number") [message,status] = [status,400];
		if (message instanceof Error) {
			related = message;
			message = related.message;
		}
		super(message);
		if (related) this.related = related;
		this.message = message;
		this.status = status;
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

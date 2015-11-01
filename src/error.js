export default class PhoneError extends Error {
	constructor(status, message) {
		if (typeof status !== "number") [message,status] = [status,400];
		super(message);
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

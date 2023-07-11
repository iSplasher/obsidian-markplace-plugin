export default class EventEmitter {
	callbacks: { [key: string]: ((...args: any[]) => any)[] } = {};

	on(event: string, cb: (...args: any[]) => any) {
		if (!this.callbacks[event]) this.callbacks[event] = [];
		this.callbacks[event].push(cb);
	}

	emit(event: string, ...data: any[]) {
		const cbs = this.callbacks[event];
		if (cbs) {
			cbs.forEach((cb) => cb(data));
		}
	}
}

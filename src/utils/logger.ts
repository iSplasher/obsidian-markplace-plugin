import MarkPlaceNotice from "src/components/notice";
import { constant } from "src/constants";

import { MarkPlaceConsoleError, MarkPlaceError } from "./error";

export default class logger {
	static debug(message: string | any, ...messages: (string | any)[]): void {
		if (!constant.isDev) return;
		console.debug(message, ...messages);
	}

	static warn(message: string, ...messages: string[]): void {
		console.warn(message, ...messages);
	}

	static log(message: string, ...messages: string[]): void {
		console.log(message, ...messages);
	}

	static error(message: string | Error, ...messages: string[]): void {
		console.error(message, ...messages);
	}

	static exception(e: Error | MarkPlaceConsoleError, notice = true): void {
		if (e instanceof MarkPlaceError) {
			if (notice) {
				e._notice();
			} else {
				console.error(e);
			}
		} else {
			console.error(e);
		}
	}

	static notice(message: string, timeout?: number) {
		new MarkPlaceNotice(message, timeout);
	}

	static debugNotice(message: string | any, ...messages: (string | any)[]) {
		if (constant.isDev) {
			let m = JSON.stringify(message);
			if (messages.length) {
				m = m + " " + messages.map((m) => JSON.stringify(m)).join(" ");
			}
			new MarkPlaceNotice(m, 2500);
		}
		logger.debug(message, ...messages);
	}
}

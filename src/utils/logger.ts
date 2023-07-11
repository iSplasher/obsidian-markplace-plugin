import MarkPlaceNotice from "../components/notice";
import { constant } from "../constants";
import { MarkPlaceConsoleError, MarkPlaceError } from "./error";

type Msg = string | any;

export default class logger {
	static debug(message: Msg, ...messages: Msg[]): void {
		if (!constant.isDev) return;
		console.debug(message, ...messages);
	}

	static warn(message: Msg, ...messages: Msg[]): void {
		console.warn(message, ...messages);
	}

	static log(message: Msg, ...messages: Msg[]): void {
		console.log(message, ...messages);
	}

	static error(message: Msg | Error, ...messages: Msg[]): void {
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

	static debugNotice(message: Msg, ...messages: Msg[]) {
		if (constant.isDev) {
			let m =
				typeof message === "string" ? message : JSON.stringify(message);
			if (messages.length) {
				m =
					m +
					" " +
					messages
						.map((m) =>
							typeof m === "string" ? m : JSON.stringify(m)
						)
						.join(" ");
			}
			new MarkPlaceNotice(m, 2500);
		}
		logger.debug(message, ...messages);
	}
}

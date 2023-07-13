import MarkPlaceNotice from "../components/notice";
import { constant } from "../constants";
import { MarkPlaceConsoleError, MarkPlaceError } from "./error";

type Msg = string | any;

const NOTICE_LOG_TIMEOUT = 10000;
export default class logger {
	private static call(func: (...args: any[]) => void, ...args: any[]) {
		if (process.env.NODE_ENV !== "test") {
			func(...args);
		}
	}

	static debug(message: Msg, ...messages: Msg[]): void {
		if (!constant.isDev) return;
		this.call(console.debug, message, ...messages);
	}

	static warn(message: Msg, ...messages: Msg[]): void {
		this.call(console.warn, message, ...messages);
	}

	static log(message: Msg, ...messages: Msg[]): void {
		this.call(console.log, message, ...messages);
	}

	static info(message: Msg, ...messages: Msg[]): void {
		this.call(console.log, message, ...messages);
	}

	static error(message: Msg | Error, ...messages: Msg[]): void {
		this.call(console.error, message, ...messages);
	}

	static exception(e: Error | MarkPlaceConsoleError, notice = true): void {
		if (e instanceof MarkPlaceError) {
			if (notice) {
				e._notice();
			} else {
				this.error(e);
			}
		} else {
			this.error(e);
		}
	}

	static notice(timeout: number, message: Msg, ...messages: Msg[]) {
		let m = typeof message === "string" ? message : JSON.stringify(message);
		if (messages.length) {
			m =
				m +
				" " +
				messages
					.map((m) => (typeof m === "string" ? m : JSON.stringify(m)))
					.join(" ");
		}

		new MarkPlaceNotice(m, timeout);
	}

	// ------------------

	// will log in addition to showing normal notice
	static infoNotice(message: Msg, ...messages: Msg[]) {
		this.notice(NOTICE_LOG_TIMEOUT, message, ...messages);
		logger.log(message, ...messages);
	}

	// will log in addition to showing normal notice
	static debugNotice(message: Msg, ...messages: Msg[]) {
		this.notice(NOTICE_LOG_TIMEOUT, message, ...messages);
		logger.debug(message, ...messages);
	}

	// will log in addition to showing normal notice
	static warnNotice(message: Msg, ...messages: Msg[]) {
		this.notice(NOTICE_LOG_TIMEOUT, message, ...messages);
		logger.warn(message, ...messages);
	}

	// ------------------

	// only shows notice in dev mode
	static devNotice(message: Msg, ...messages: Msg[]) {
		if (constant.isDev) {
			this.notice(5000, message, ...messages);
		}
	}

	// will log in addition to showing dev notice
	static devInfoNotice(message: Msg, ...messages: Msg[]) {
		this.devNotice(message, ...messages);
		logger.log(message, ...messages);
	}

	// will log in addition to showing dev notice
	static devDebugNotice(message: Msg, ...messages: Msg[]) {
		this.devNotice(message, ...messages);
		logger.debug(message, ...messages);
	}

	// will log in addition to showing dev notice
	static devWarnNotice(message: Msg, ...messages: Msg[]) {
		this.devNotice(message, ...messages);
		logger.warn(message, ...messages);
	}
}

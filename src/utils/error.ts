import { CustomError } from "ts-custom-error";

import ErrorModal from "../components/modals/error";
import {
	formatNoticeMessage,
	MarkPlaceErrorNotice,
} from "../components/notice";
import { constant } from "../constants";
import logger from "./logger";

export class MarkPlaceConsoleError extends CustomError {
	constructor(...messages: string[]) {
		super(messages.join(" "));
	}
}

export class AppNotDefinedError extends MarkPlaceConsoleError {
	constructor() {
		super("App is not defined");
	}
}

export class MarkPlaceError extends MarkPlaceConsoleError {
	brief: string;
	details: string;
	consoleMsg: string;

	constructor(brief: string, ...messages: string[]) {
		const details = messages.join(" ");
		const consoleMsg = formatNoticeMessage(brief, details);
		super(consoleMsg);
		this.brief = brief;
		this.details = details;
		this.consoleMsg = consoleMsg;
	}

	static notice(brief: string, ...messages: string[]) {
		const err = new this(brief, ...messages);
		return err._notice();
	}

	_notice() {
		if (constant.settings?.showError === "modal") {
			new ErrorModal(this).open();
		} else if (constant.settings?.showError === "notice") {
			new MarkPlaceErrorNotice(this);
		} else {
			logger.error(this);
		}

		return this;
	}
}

export class ParserConsoleError extends MarkPlaceConsoleError {}

export class ParserError extends MarkPlaceError {}

// @ts-ignore
export class ParserLocationError extends ParserError {
	contentName: string;
	line: number;

	constructor(
		brief: string,
		line: number,
		contentName?: string,
		...messages: string[]
	) {
		const unknown = "[unknown]";
		super(
			brief,
			...messages,
			`[at line ${line} in ${contentName ?? unknown}]`
		);
		this.line = line;
		this.contentName = contentName ?? unknown;
	}

	static notice(
		brief: string,
		line: number,
		contentName?: string,
		...messages: string[]
	) {
		const err = new this(brief, line, contentName, ...messages);
		return err._notice();
	}
}

export class RenderConsoleError extends MarkPlaceConsoleError {}

export class RenderError extends MarkPlaceError {}

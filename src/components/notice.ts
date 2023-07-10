import { Notice } from "obsidian";
import logger from "src/utils/logger";

import type { MarkPlaceError } from "src/utils/error";
export function formatNoticeMessage(brief: string, details: string) {
	return `${brief}\n  ------\n  ${details.replace(
		/\n ?/g,
		"\n  "
	)}\n  ------`;
}

export default class MarkPlaceNotice extends Notice {
	constructor(message: string, timeout = 8000) {
		const brief = "MarkPlace";
		const details = message;
		super(formatNoticeMessage(brief, details), timeout);
	}
}

export class MarkPlaceErrorNotice extends Notice {
	constructor(error: MarkPlaceError, timeout = 8000) {
		logger.error(error);
		const message = formatNoticeMessage(error.brief, error.details);
		super(`${error.name}\n> ${message}`, timeout);
	}
}

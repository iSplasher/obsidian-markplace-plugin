import cx from "classnames";
import { Modal } from "obsidian";
import { CLASSES, constant } from "src/constants";
import { AppNotDefinedError, MarkPlaceError } from "src/utils/error";
import logger from "src/utils/logger";

export default class ErrorModal extends Modal {
	error: MarkPlaceError;

	constructor(error: MarkPlaceError) {
		if (!constant.app) throw new AppNotDefinedError();
		super(constant.app);

		this.error = error;
	}

	onOpen() {
		const { contentEl } = this;
		const contentDiv = contentEl.createDiv({
			cls: cx(CLASSES.modal, CLASSES.error),
		});

		logger.error(this.error);

		contentDiv.createEl("h2", {
			text: `MarkPlace Error: ${this.error.name}`,
		});
		contentDiv.createEl("h3", { text: this.error.brief });

		const detailsEl = contentDiv.createDiv({
			cls: cx(CLASSES.errorDetails),
		});

		this.error.details.split("\n").forEach((line) => {
			detailsEl.createEl("span", { text: line });
			detailsEl.createEl("br");
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

import { MarkdownView } from "obsidian";

import { constant } from "../constants";
import { Parsed } from "../parser/parser";
import logger from "../utils/logger";

export default class MarkPlaceRenderer {
	constructor() {
		this.attach();
	}

	attach() {
		if (constant?.events) {
			constant.events.on("parsed", this.onRender, this);
		}
	}

	detach() {
		if (constant?.events) {
			constant.events.off("parsed", this.onRender, this);
		}
	}

	async onRender(view: MarkdownView, parsed: Parsed) {
		logger.infoNotice(view?.containerEl.innerText);

		const currentFile = view.file;

		const blocks = [...parsed.blocks.values()];

		console.log(view.contentEl);
		console.log(view.containerEl);

		await constant.app?.vault.process(currentFile, (d) => {
			let content = d;
			for (const block of blocks) {
				if (block.hasRendered()) {
					logger.devNotice(
						"Already rendered",
						block.startTag.content.trim()
					);
					continue;
				}
				const left = content.slice(0, block.contentStart);
				const right = content.slice(block.contentEnd);

				logger.devNotice(block.content);
				const sep = block.singleLine() ? "" : "\n";
				try {
					content =
						left + sep + `${eval(block.content)}` + sep + right;

					block.render();
				} catch (e) {
					logger.warnNotice("Execution error", e?.message);
				}
			}

			return content;
		});
	}
}

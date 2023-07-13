import { MarkdownView, Vault } from "obsidian";

import { constant } from "../constants";
import Evaluator from "../evaluator/evaluator";
import { Block, Parsed } from "../parser/parser";
import logger from "../utils/logger";
import Generator from "./generator";

export default class MarkPlaceRenderer {
	constructor(public vault: Vault) {
		this.attach();
	}

	attach() {
		if (constant?.events) {
			constant.events.on("renderRequest", this.onRender, this);
		}
	}

	detach() {
		if (constant?.events) {
			constant.events.off("renderRequest", this.onRender, this);
		}
	}

	async onRender(view: MarkdownView, parsed: Parsed) {
		logger.infoNotice(view?.containerEl.innerText);

		const currentFile = view.file;

		const blocks = [...parsed.blocks.values()];

		console.log(view.contentEl);
		console.log(view.containerEl);

		const evaluator = new Evaluator();

		for (const block of blocks) {
			await this.renderBlock(block, evaluator);
		}

		await this.vault.process(currentFile, (originalContent) => {
			let newContent = "";
			let prevBlock: Block | null = null;
			let idx = -1;

			while (prevBlock || idx === -1) {
				const prevOldEnd = prevBlock ? prevBlock.originalEndTag.end : 0;
				let currentOldStart = originalContent.length;

				const block = blocks[++idx];

				if (block) {
					currentOldStart = block.originalStartTag.start;
				}

				// add the content between the previous block and the current block
				newContent += originalContent.slice(
					prevOldEnd,
					currentOldStart
				);
				// add the content of the current block
				if (block) {
					newContent += block.outerContent;
				}

				prevBlock = block;
			}

			if (constant?.events) {
				constant.events.emit("renderContent", currentFile, newContent);
			}
			return newContent;
		});
	}

	async renderBlock(block: Block, evaluator: Evaluator) {
		if (block.hasRendered()) {
			return block;
		}

		// reuse if therer's a legacy
		if (block.hasLegacyRender()) {
			block.setRender(true);
		} else {
			try {
				const generator = new Generator();
				await evaluator.run(generator, block.preContent);
				block.render(generator.compile());
			} catch (e) {
				logger.debugNotice("Error evaluating code", e?.message);
			}
		}

		return block;
	}
}

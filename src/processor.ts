import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView,
	TFile,
	View,
} from "obsidian";

import Cache from "./cache";
import { constant } from "./constants";
import Parser, { Parsed, ParserContent } from "./parser/parser";
import logger from "./utils/logger";
import { loadedDebounce } from "./utils/misc";

export default class MarkPlaceProcessor {
	parseContent: (
		...args: Parameters<MarkPlaceProcessor["parseContentImmediate"]>
	) => void;

	constructor(public app: App, public parser: Parser, public cache: Cache) {
		this.parseContent = loadedDebounce(
			this.parseContentImmediate.bind(this),
			100
		);
	}

	async process(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf) return;
		await this.parseViewContent(leaf.view);
	}

	async parseViewContent(genericView: View) {
		if (genericView.getViewType() === "markdown") {
			const view = genericView as MarkdownView;

			// if in allowed mode
			const mode = getViewMode(view.getState());

			if (mode === "source") {
				// still editing
				return;
			}

			if (mode === "live" && !constant?.settings?.liveRendering) {
				return;
			}

			const file = view.file;

			const cb = (v: typeof view, f: TFile, parsed: Parsed) =>
				this.onParsed(v, parsed, f);

			await this.parseContent(
				view.editor.getValue(),
				view.file,
				cb.bind(this, view, file)
			);
		}
	}

	async parseContentImmediate(
		content: string,
		file: TFile | null,
		cb?: (parsed: Parsed) => any
	) {
		const c: ParserContent = {
			content,
			name: file?.path,
		};

		const parsed = this.parser.parse(c);
		if (cb) {
			await cb(parsed);
		}

		return parsed;
	}

	async onParsed(view: MarkdownView, parsed: Parsed, oldFile?: TFile | null) {
		const state = view.getState();
		const currentFile = view.file;

		// view no longer active
		if (!state?.file) {
			logger.warn("View no longer active");
			return;
		}

		// file no longer active
		// TODO: what about renames?
		if (!currentFile || (oldFile && oldFile.path !== currentFile.path)) {
			logger.warn("File no longer active");
			return;
		}

		if (parsed.hasChanged()) {
			const blocks = [...parsed.blocks.values()];

			await this.cache.cacheBlocks(currentFile.path, blocks);

			if (constant?.events) {
				constant.events.emit("parsed", view, parsed);
			}
		}
	}
}

export function getViewMode(state: { mode: string; source: boolean }) {
	if (state?.mode === "preview") {
		return "reading";
	} else if (state?.mode === "source" && !state?.source) {
		return "live";
	} else if (state?.mode === "source" && state?.source) {
		return "source";
	}
}

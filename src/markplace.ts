import debounce from "lodash/debounce";
import {
	App,
	Editor,
	MarkdownFileInfo,
	MarkdownView,
	TFile,
	View,
} from "obsidian";

import Parser, { Parsed, ParserContent } from "./parser/parser";
import logger from "./utils/logger";

import type MarkPlacePlugin from "./main";
export default class MarkPlace {
	plugin: MarkPlacePlugin;
	app: App;
	parser: Parser;

	parseContent: (
		...args: Parameters<MarkPlace["parseContentImmediate"]>
	) => void;

	constructor(plugin: MarkPlacePlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.parser = new Parser();

		this.parseContent = debounce(
			this.parseContentImmediate.bind(this),
			100
		);
	}

	async onload() {
		await this.registerEvents();
	}

	async registerEvents() {
		this.plugin.registerEvent(
			this.app.vault.on("create", () => {
				logger.debugNotice("a new file has entered the arena");
			})
		);

		this.plugin.registerEvent(
			this.app.workspace.on("editor-change", async (editor, info) => {
				await this.onChange(editor, info);
			})
		);

		this.plugin.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				await this.onLayoutChange();
			})
		);
	}

	onunload() {}

	async onChange(editor: Editor, info: MarkdownView | MarkdownFileInfo) {
		if (info instanceof View) {
			await this.parseViewContent(info);
		}
	}

	async onLayoutChange() {
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf) return;

		const viewState = leaf.getViewState();

		switch (getViewMode(viewState?.state)) {
			case "reading":
				await this.onSwitchToReading(leaf.view);
				break;
			case "live":
				await this.onSwitchToLive(leaf.view);
				break;
			case "source":
				await this.onSwitchToSource(leaf.view);
				break;
		}
	}

	async onSwitchToReading(view: View) {
		return await this.parseViewContent(view);
	}

	async onSwitchToLive(view: View) {
		return await this.parseViewContent(view);
	}

	async onSwitchToSource(view: View) {}

	async parseViewContent(genericView: View) {
		if (genericView.getViewType() === "markdown") {
			const view = genericView as MarkdownView;

			// if in allowed mode
			const mode = getViewMode(view.getState());

			if (mode === "source") {
				// still editing
				return;
			}

			if (mode === "live" && !this.plugin.settings.liveRendering) {
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
		if (oldFile && oldFile.path !== currentFile.path) {
			logger.warn("File no longer active");
			return;
		}

		if (parsed.changed()) {
			const content = [...parsed.blocks.values()]
				.map((b) => b.content)
				.join("%%\n");
			logger.debugNotice(parsed.blockCount(), "\n", content);
		}
	}
}

function getViewMode(state: { mode: string; source: boolean }) {
	if (state?.mode === "preview") {
		return "reading";
	} else if (state?.mode === "source" && !state?.source) {
		return "live";
	} else if (state?.mode === "source" && state?.source) {
		return "source";
	}
}

import { App, Editor, MarkdownFileInfo, MarkdownView, View } from "obsidian";

import Cache from "./cache";
import { constant } from "./constants";
import Parser from "./parser/parser";
import MarkPlaceProcessor, { getViewMode } from "./processor";
import MarkPlaceRenderer from "./render/renderer";
import logger from "./utils/logger";

import type MarkPlacePlugin from "./main";

const PROCESSOR_SORT_ORDER = 9999;

export default class MarkPlace {
	plugin: MarkPlacePlugin;
	app: App;
	parser: Parser;
	processor: MarkPlaceProcessor;
	renderer: MarkPlaceRenderer;
	cache: Cache;
	loaded: boolean;

	constructor(plugin: MarkPlacePlugin) {
		constant.loaded = true;
		this.loaded = true;
		this.plugin = plugin;
		this.app = plugin.app;
		this.parser = new Parser();
		this.cache = new Cache(this.app.vault, this.plugin.settings.cachePath);
		this.renderer = new MarkPlaceRenderer(this.app.vault);
		this.processor = new MarkPlaceProcessor(
			this.app,
			this.parser,
			this.cache
		);
	}

	async onload() {
		this.loaded = true;
		await this.registerEvents();

		this.plugin.registerMarkdownPostProcessor(
			this.processor.process.bind(this.processor),
			PROCESSOR_SORT_ORDER
		);
	}

	async registerEvents() {
		this.plugin.registerEvent(
			this.app.vault.on("create", () => {
				logger.devNotice("a new file has entered the arena");
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

	onunload() {
		this.loaded = false;
		constant.loaded = false;
	}

	async onChange(editor: Editor, info: MarkdownView | MarkdownFileInfo) {
		if (info instanceof View) {
			await this.processor.parseViewContent(info);
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
		return await this.processor.parseViewContent(view);
	}

	async onSwitchToLive(view: View) {
		return await this.processor.parseViewContent(view);
	}

	async onSwitchToSource(view: View) {}
}

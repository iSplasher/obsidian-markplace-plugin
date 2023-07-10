import { App, Editor, MarkdownFileInfo, MarkdownView } from "obsidian";

import logger from "./utils/logger";

import type MarkPlacePlugin from "./main";
export default class MarkPlace {
	plugin: MarkPlacePlugin;
	app: App;

	constructor(plugin: MarkPlacePlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
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
		logger.debugNotice("editor change");
	}

	async onLayoutChange() {
		logger.debugNotice(`${this.plugin.manifest.dir}`);
	}

	async onSwitchToReading() {
		logger.debugNotice("switch to reading mode");
	}

	async onSwitchToLive() {
		logger.debugNotice("switch to live");
	}
}

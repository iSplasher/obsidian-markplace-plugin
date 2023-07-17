import { App, PluginSettingTab, Setting } from "obsidian";

import { CLASSES, constant } from "../constants";

import type MarkPlacePlugin from "../main";
export const DEFAULT_SETTINGS = {
	showError: "modal" as "modal" | "notice" | "none",
	showNotice: {},
	cache: true,
	cachePath: "",
	liveRendering: false,
	debug: constant.isDev,
};

export type MarkPlacePluginSettings = typeof DEFAULT_SETTINGS;

export default class MarkPlaceSettingTab extends PluginSettingTab {
	plugin: MarkPlacePlugin;

	constructor(app: App, plugin: MarkPlacePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.addClass(CLASSES.settings);

		containerEl.createEl("h1", { text: "MarkPlace" });

		const createHeader = (text: string) =>
			containerEl.createEl("h2", { text });

		const descEl = containerEl.createDiv();

		const usageEl = containerEl.createEl("blockquote");

		usageEl.append(
			"Tag syntax: ",
			descEl.createEl("code", {
				text: "%%{{modifier?} your block name }%% content %%{ end }%%",
			}),
			descEl.createEl("br"),
			"Modifiers decide when to render, choices are ",
			descEl.createEl("code", {
				text: "'!'",
			}),
			" (for immediate), ",
			descEl.createEl("code", {
				text: "'*'",
			}),
			" (for delayed) or nothing (default).",
			descEl.createEl("br"),
			"To escape the tag syntax, use ",
			descEl.createEl("code", {
				text: "'\\'",
			}),
			" like this: ",
			descEl.createEl("code", {
				text: "%%{ your block \\}%% name }%% some-\\%%{-conent %%{ end }%%",
			})
		);

		descEl.append(
			"MarkPlace is a templating plugin that allows you to render ",
			descEl.createEl("em", { text: "in place" }),
			", directly inside your notes.",
			descEl.createEl("br"),
			descEl.createEl("br"),
			descEl.createEl("b", { text: "Usage:" }),
			descEl.createEl("br"),
			usageEl,
			descEl.createEl("br")
		);

		createHeader("Cache");

		const cacheDesc = document.createDocumentFragment();
		cacheDesc.append(
			"MarkPlace is able to cache the original content of blocks.",
			document.createElement("br"),
			"This allows you to still work with the original content even after a block has rendered.",
			document.createElement("br"),
			"The cache is stored to a file in a JSON format, and is not meant to be edited by hand.",
			document.createElement("br"),
			"You can however, delete the file to reset the cache."
		);

		new Setting(containerEl).setDesc(cacheDesc).setDisabled(true);

		new Setting(containerEl).setName("Enable cache").addToggle((toggle) => {
			toggle
				.setValue(this.plugin.settings.cache)
				.onChange(async (value: MarkPlacePluginSettings["cache"]) => {
					await this.plugin.saveSettings({
						cache: value,
					});
				});
		});

		const cacheFileDesc = document.createDocumentFragment();
		cacheFileDesc.append(
			"The path must point to a location inside your vault. If the file does not exist, it will be created.",
			cacheFileDesc.createEl("br"),
			"The file extension can be anything, but defaults to .md"
		);
		new Setting(containerEl)
			.setName("Cache file location")
			.setDesc(cacheFileDesc)
			.setDisabled(true);

		const cacheFileEl = new Setting(containerEl).addText((text) => {
			text.setPlaceholder("Example: path/to/_cache.md")
				.setValue(this.plugin.settings.cachePath)
				.onChange(async (value) => {
					await this.plugin.saveSettings({
						cachePath: value,
					});
				});
		});
		cacheFileEl.controlEl.addClass(CLASSES.settingsWideControl);

		createHeader("Advanced");

		new Setting(containerEl)
			.setName("Report error")
			.setDesc("Specify how to report errors.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("modal", "Modal")
					.addOption("notice", "Notice")
					.addOption("none", "None")
					.setValue(this.plugin.settings.showError)
					.onChange(
						async (value: MarkPlacePluginSettings["showError"]) => {
							const v = (
								["modal", "notice", "none"] as const
							).includes(value)
								? value
								: "none";

							await this.plugin.saveSettings({
								showError: v,
							});
						}
					);
			});

		const liveRendDesc = document.createDocumentFragment();
		liveRendDesc.append(
			"Block rendering will always occur in reading mode, however, you can toggle this on to also render when live editing.",
			document.createElement("br"),
			"This may result in a janky editing experience, so enable with caution.",
			document.createElement("br"),
			"Note: rendering will never occur in source mode."
		);

		new Setting(containerEl)
			.setName("Live Rendering")
			.setDesc(liveRendDesc)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.liveRendering)
					.onChange(
						async (
							value: MarkPlacePluginSettings["liveRendering"]
						) => {
							await this.plugin.saveSettings({
								liveRendering: value,
							});
						}
					);
			});

		new Setting(containerEl)
			.setName("Debug")
			.setDesc("Enables debug logging and extra error information.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.liveRendering)
					.onChange(
						async (value: MarkPlacePluginSettings["debug"]) => {
							await this.plugin.saveSettings({
								debug: value,
							});
						}
					);
			});

		createHeader("Statistics");
		const statsDesc = document.createDocumentFragment();

		const statEl = (name: string, value: string) => {
			const el = statsDesc.createSpan({ cls: CLASSES.stat });
			el.dataset.markplaceStatName = name;
			el.append(
				el.createEl("b", { text: `${name}: ` }),
				el.createSpan({ cls: CLASSES.statValue, text: value })
			);

			return el;
		};

		statsDesc.append(
			statEl("Blocks", "0"),
			document.createElement("br"),
			statEl("Cached blocks", "0"),
			document.createElement("br"),
			statEl("Blocks with non-unique identifiers (in same file)", "0"),
			document.createElement("br")
		);

		new Setting(containerEl).setDesc(statsDesc).setDisabled(true);
	}
}

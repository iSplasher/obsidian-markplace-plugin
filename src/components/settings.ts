import { App, PluginSettingTab, Setting } from "obsidian";

import type MarkPlacePlugin from "../main";

export const DEFAULT_SETTINGS = {
	showError: "modal" as "modal" | "notice" | "none",
	showNotice: {},
	liveRendering: false,
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

		containerEl.createEl("h2", { text: "MarkPlace" });

		const descEl = containerEl.createDiv();
		descEl.append(
			"MarkPlace is a templating plugin that allows you to render render text directly inside your markdown.",
			descEl.createEl("br"),
			"Syntax: ",
			descEl.createEl("code", {
				text: "%{modifier?} your block name % content % end %",
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
			" (for delayed) or nothing (default)."
		);

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

							this.plugin.settings.showError = v;
							await this.plugin.saveSettings();
						}
					);
			});

		new Setting(containerEl)
			.setName("Live rendering")
			.setDesc(
				"Rendering will always occur in reading mode, however, you can toggle this to also render when live editing."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.liveRendering)
					.onChange(
						async (
							value: MarkPlacePluginSettings["liveRendering"]
						) => {
							this.plugin.settings.liveRendering = value;
							await this.plugin.saveSettings();
						}
					);
			});
	}
}

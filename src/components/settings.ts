import { App, PluginSettingTab, Setting } from "obsidian";

import type MarkPlacePlugin from "src/main";

export const DEFAULT_SETTINGS = {
	showError: "modal" as "modal" | "notice" | "none",
	showNotice: {},
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

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Report error")
			.setDesc("Specify how to report errors")
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
	}
}

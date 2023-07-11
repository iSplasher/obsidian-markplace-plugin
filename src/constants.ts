import { App } from "obsidian";

import type { MarkPlacePluginSettings } from "./components/settings";

export const CLASSES = {
	modal: "markplace-modal",
	error: "markplace-error",
	errorDetails: "markplace-error-details",

	// settings classes
	settings: "markplace-settings",
	settingsWideControl: "markplace-wide-control",
	settingsExpandedControl: "markplace-expanded-control",
	stat: "markplace-stat",
	statValue: "markplace-stat-value",

	// misc classes
	indent: "markplace-indent",
};

export class constant {
	static app?: App;
	static settings?: MarkPlacePluginSettings;
	static isDev =
		typeof process !== "undefined" &&
		process.env.NODE_ENV === "development";
}

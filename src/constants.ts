import { App } from "obsidian";

import type { MarkPlacePluginSettings } from "./components/settings";
import type Emitter from "./events";

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
	static loaded = false;
	static app?: App;
	static events?: Emitter;
	static settings?: MarkPlacePluginSettings;
	static isDev =
		typeof process !== "undefined" &&
		process.env.NODE_ENV === "development";
}

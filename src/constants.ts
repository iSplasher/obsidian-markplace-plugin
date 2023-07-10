import { App } from "obsidian";

import type { MarkPlacePluginSettings } from "./components/settings";

export const CLASSES = {
	modal: "markplace-modal",
	error: "markplace-error",
	errorDetails: "markplace-error-details",
};

export class constant {
	static app?: App;
	static settings?: MarkPlacePluginSettings;
	static isDev =
		typeof process !== "undefined" &&
		process.env.NODE_ENV === "development";
}

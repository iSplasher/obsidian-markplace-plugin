import EventEmitter from "eventemitter3";
import { MarkdownView, TFile } from "obsidian";

import type { MarkPlacePluginSettings } from "./components/settings";
import type { Parsed } from "./parser/parser";

export interface EventMap {
	settingsChanged: (
		newSettings: MarkPlacePluginSettings,
		oldSettings: MarkPlacePluginSettings
	) => any;

	parseChange: (view: MarkdownView, parsed: Parsed) => any;
	renderRequest: (view: MarkdownView, parsed: Parsed) => any;
	renderContent: (file: TFile, content: string) => any;
	layoutChange: (
		mode: "source" | "live" | "reading",
		view: MarkdownView
	) => any;
}

export default class Emitter extends EventEmitter<EventMap> {}

import EventEmitter from "eventemitter3";
import { MarkdownView } from "obsidian";

import type { MarkPlacePluginSettings } from "./components/settings";
import type { Parsed } from "./parser/parser";

export interface EventMap {
	settingsChanged: (
		newSettings: MarkPlacePluginSettings,
		oldSettings: MarkPlacePluginSettings
	) => any;

	parsed: (view: MarkdownView, parsed: Parsed) => any;
}

export default class Emitter extends EventEmitter<EventMap> {}

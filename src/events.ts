import EventEmitter from "eventemitter3";

import type { MarkPlacePluginSettings } from "./components/settings";

export interface EventMap {
	settingsChanged: (
		newSettings: MarkPlacePluginSettings,
		oldSettings: MarkPlacePluginSettings
	) => any;
}

export default class Emitter extends EventEmitter<EventMap> {}

import { App } from "obsidian";

import { DEFAULT_SETTINGS } from "../src/components/settings";
import { constant } from "../src/constants";
import Emitter from "../src/events";

export const oldConstant = Object.assign({}, constant);

export function createConstantValues() {
	return {
		loaded: true,
		app: new App(),
		events: new Emitter(),
		settings: Object.assign({}, DEFAULT_SETTINGS),
		isDev: true,
	};
}

export function setupConstant(values?: Partial<typeof constant>) {
	const oc = oldConstant;

	return Object.assign(constant, createConstantValues(), oc, values);
}

export function teardownConstant() {
	Object.keys(constant).forEach((key) => {
		// @ts-ignore
		constant[key] = oldConstant[key];
	});
}

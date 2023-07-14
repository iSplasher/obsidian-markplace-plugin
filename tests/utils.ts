import { App } from "obsidian";

import { DEFAULT_SETTINGS } from "../src/components/settings";
import { constant } from "../src/constants";
import Emitter from "../src/events";
import { Block } from "../src/parser/parser";

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

export function createBlock(content = "\ncontent\n") {
	const startContent = "start";
	const startOuterContent = `%%{ ${startContent} }%%`;
	const endContent = "end";
	const endOuterContent = `%%{ ${endContent} }%%`;

	return new Block(
		{
			start: 0,
			end: startOuterContent.length,
			content: startContent,
			outerContent: startOuterContent,
			escapes: [],
		},
		0,
		1,
		null,
		{
			start: startOuterContent.length + content.length,
			end:
				startOuterContent.length +
				content.length +
				endOuterContent.length,
			content: endContent,
			outerContent: endOuterContent,
			escapes: [],
		},
		4,
		content
	);
}

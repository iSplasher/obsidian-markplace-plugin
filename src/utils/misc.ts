import { debounce, Debouncer } from "obsidian";

import { constant } from "../constants";

export function argsort(array: any[]): number[] {
	const indices = array.map((value, index) => index);

	indices.sort((a, b) => array[a] - array[b]);

	return indices;
}

export function loadedDebounce<T extends unknown[], V>(
	cb: (...args: [...T]) => V,
	timeout?: number,
	resetTimer?: boolean
): Debouncer<T, V> {
	return debounce(
		(...args) => {
			if (!constant.loaded) return;
			return cb(...args);
		},
		timeout,
		resetTimer
	);
}

// https://github.com/MartinKolarik/dedent-js/
export function dedent(
	templateStrings: TemplateStringsArray | string,
	...values: any[]
) {
	const matches = [];
	const strings =
		typeof templateStrings === "string"
			? [templateStrings]
			: templateStrings.slice();

	// 1. Remove trailing whitespace.
	strings[strings.length - 1] = strings[strings.length - 1].replace(
		/\r?\n([\t ]*)$/,
		""
	);

	// 2. Find all line breaks to determine the highest common indentation level.
	for (let i = 0; i < strings.length; i++) {
		const match = strings[i].match(/\n[\t ]+/g);

		if (match) {
			matches.push(...match);
		}
	}

	// 3. Remove the common indentation from all strings.
	if (matches.length) {
		const size = Math.min(...matches.map((value) => value.length - 1));
		const pattern = new RegExp(`\n[\t ]{${size}}`, "g");

		for (let i = 0; i < strings.length; i++) {
			strings[i] = strings[i].replace(pattern, "\n");
		}
	}

	// 4. Remove leading whitespace.
	strings[0] = strings[0].replace(/^\r?\n/, "");

	// 5. Perform interpolation.
	let string = strings[0];

	for (let i = 0; i < values.length; i++) {
		string += values[i] + strings[i + 1];
	}

	return string;
}

export function isAlphaNumeric(str: string) {
	let code: number;
	// @ts-ignore
	let len = str.length;

	for (let i = 0, len = str.length; i < len; i++) {
		code = str.charCodeAt(i);
		if (
			!(code > 47 && code < 58) && // numeric (0-9)
			!(code > 64 && code < 91) && // upper alpha (A-Z)
			!(code > 96 && code < 123)
		) {
			// lower alpha (a-z)
			return false;
		}
	}
	return true;
}

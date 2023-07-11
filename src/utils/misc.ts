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

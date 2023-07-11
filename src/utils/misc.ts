export function argsort(array: any[]): number[] {
	const indices = array.map((value, index) => index);

	indices.sort((a, b) => array[a] - array[b]);

	return indices;
}

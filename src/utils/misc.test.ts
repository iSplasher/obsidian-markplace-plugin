import { argsort } from "./misc";

describe("Misc utilities", () => {
	test("correct argsort indices", async () => {
		const arr = [1, 5, 3, 2, 4];
		const sorted = argsort(arr);

		expect(sorted).toEqual([0, 3, 2, 4, 1]);

		// with repeated values
		const arr2 = [1, 5, 3, 2, 4, 5];
		const sorted2 = argsort(arr2);

		expect(sorted2).toEqual([0, 3, 2, 4, 1, 5]);

		// only 2 values
		const arr3 = [5, 1];
		const sorted3 = argsort(arr3);

		expect(sorted3).toEqual([1, 0]);

		const arr4 = [10, 1, 8];
		const sorted4 = argsort(arr4);

		expect(sorted4).toEqual([1, 2, 0]);
	});
});

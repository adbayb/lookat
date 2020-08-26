import { observable, observer } from "../src";

describe("observable", () => {
	test("should notify observer on change", () => {
		const counter = observable(0);
		const callback = jest.fn(() => {
			return counter.value;
		});

		observer(callback);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveReturnedWith(0);
		counter.value++;
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveReturnedWith(1);
	});
});

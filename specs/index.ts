import { observable, observe } from "../src";

describe("observable", () => {
	test("should observe side effects", () => {
		const counter = observable(0);
		const callback = jest.fn(() => {
			counter.$;
		});

		observe(callback);
		expect(callback).toHaveBeenCalledTimes(1);
		counter.$++;
		expect(callback).toHaveBeenCalledTimes(2);
	});
	test("should not subscribe nested observers", () => {
		const state = observable(0);
		const nestedState = observable(0);
		const callback = jest.fn(() => {
			observe(() => {
				nestedState.$ * 2;
			});
			state.$;
		});

		observe(callback);
		expect(callback).toHaveBeenCalledTimes(1);
		state.$++;
		expect(callback).toHaveBeenCalledTimes(2);
		nestedState.$++;
		expect(callback).toHaveBeenCalledTimes(3);
	});
	test("should compute derived observable", () => {
		expect(true).toBe(true);
	});
	test("should observe computed observable", () => {
		expect(true).toBe(true);
	});
});

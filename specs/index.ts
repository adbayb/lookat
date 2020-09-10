import { observable } from "../src";
import { observe } from "../src";

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

	test("should observe and compute derived observable", () => {
		const value = observable(0);
		const doubleValue = observe(() => value.$ * 2);
		const callback = jest.fn(() => {
			return doubleValue.$;
		});

		observe(callback);
		expect(doubleValue.$).toBe(0);
		expect(callback).toHaveReturnedWith(0);
		value.$++;
		expect(doubleValue.$).toBe(2);
		expect(callback).toHaveReturnedWith(2);
		value.$++;
		expect(doubleValue.$).toBe(4);
		expect(callback).toHaveReturnedWith(4);
	});

	test("should make the root observer the single source of truth and not subscribe nested observers", () => {
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

	test("should observe object property update", () => {
		const person = observable({ firstName: "Ayoub", age: 28 });
		const handleAgeChange = jest.fn(() => {
			person.$.age;
		});
		const handleFirstNameChange = jest.fn(() => {
			person.$;
		});

		observe(handleAgeChange);
		observe(handleFirstNameChange);

		person.$.age++;

		expect(handleFirstNameChange).toHaveBeenCalledTimes(1);
		expect(handleAgeChange).toHaveBeenCalledTimes(2);
	});
});

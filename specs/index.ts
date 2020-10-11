import { observable } from "../src";
import { observe } from "../src";

const INITIAL_OBSERVE_COUNT = 1;

describe("core", () => {
	test("should observe update", () => {
		const counter = observable(0);
		const callback = jest.fn(() => {
			counter.$;
		});

		observe(callback);

		expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
		counter.$++;
		expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe conditional dependencies", () => {
		const counter = observable(0);
		const limit = observable(false);
		const callback = jest.fn(() => {
			if (counter.$ >= 2) {
				limit.$ = true;
			}
		});
		const limitCallback = jest.fn(() => {
			limit.$;
		});

		observe(callback);
		observe(limitCallback);

		counter.$++;
		expect(limitCallback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
		counter.$++;
		expect(limitCallback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe derived observable update", () => {
		const value = observable(0);
		const doubleValue = observable(() => value.$ * 2);

		expect(doubleValue.$).toBe(0);
		value.$++;
		expect(doubleValue.$).toBe(2);
		value.$++;
		expect(doubleValue.$).toBe(4);
	});

	test("should ignore nested observers subscriptions", () => {
		const state = observable(0);
		const nestedState = observable(0);
		const callback = jest.fn(() => {
			observe(() => {
				nestedState.$ * 2;
			});
			state.$;
		});

		observe(callback);

		expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
		state.$++;
		expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
		nestedState.$++;
		expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 2);
	});
});

describe("object", () => {
	const person = observable({ firstName: "Ayoub", age: 28 });
	const handleAgeChange = jest.fn(() => {
		person.$.age;
	});
	const handleFirstNameChange = jest.fn(() => {
		person.$.firstName;
	});

	beforeEach(() => {
		handleAgeChange.mockClear();
		handleFirstNameChange.mockClear();
	});

	test("should observe property updates", () => {
		observe(handleAgeChange);
		observe(handleFirstNameChange);

		person.$.age++;

		expect(handleFirstNameChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT
		);
		expect(handleAgeChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT + 1
		);

		person.$.firstName = "New FirstName";

		expect(handleFirstNameChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT + 1
		);
		expect(handleAgeChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT + 1
		);
	});

	// @note: following test test if parent updates impacts its children (capture phase)
	test("should observe cascade property updates (capture phase)", () => {
		observe(handleAgeChange);
		observe(handleFirstNameChange);

		// @ts-ignore
		person.$ = {};

		// @todo: should be fine (working as expected in a non test environment)
		// Check why jest handles it differently
		expect(handleFirstNameChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT + 1
		);
		expect(handleAgeChange).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT + 1
		);
	});
});

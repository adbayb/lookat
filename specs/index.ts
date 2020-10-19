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
	test("should observe property updates", () => {
		const person = observable({ firstName: "Ayoub", age: 28 });
		const handleAgeChange = jest.fn(() => person.$.age);
		const handleFirstNameChange = jest.fn(() => person.$.firstName);

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
	test("should recompute observable dependencies on the fly given parent property reset", () => {
		const person = observable({ firstName: "Ayoub", age: 28 });
		const handleAgeChange = jest.fn(() => person.$.age);
		const handleFirstNameChange = jest.fn(() => person.$.firstName);

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

	test("should not observe properties which are not traversed within `observe` callback", () => {
		const state = observable({ hasChild: { hasGrandChild: true } });
		const storedReference = state.$.hasChild;
		const handleChange = jest.fn(() => {
			state.$.hasChild.hasGrandChild;
		});
		const handleChangeWithStoredReference = jest.fn(() => {
			storedReference.hasGrandChild;
		});

		observe(handleChange);
		observe(handleChangeWithStoredReference);

		// @note: we create a new object. state.$.hasChild has a new reference.
		// Then handleChangeWithStoredReference should not be notified since it relies on the old hasChild reference
		state.$.hasChild = { hasGrandChild: false };

		// @todo: should be fine (working as expected in a non test environment)
		// Check why jest handles it differently
		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
		expect(handleChangeWithStoredReference).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT
		);
	});
});

describe("array", () => {
	test("should observe array reference update and not observe mutable api (push)", () => {
		const list = observable([1, 2, 3]);
		const handleChange = jest.fn(() => {
			list.$;
		});

		observe(handleChange);

		list.$ = [4, 5];
		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);

		list.$.push(6);
		// @note: no reference change for `list.$` so the associated observer won't be called
		// even if the array content was updated by the addition of one value.
		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should loop array given a new item pushed", () => {
		// @todo: map...
		const list = observable([1, 2, 3]);
		const handleChange = jest.fn(() => {
			list.$.forEach((item) => item);
		});

		observe(handleChange);

		list.$.push(4);
		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe delete operation", () => {
		const list = observable([1, 2, 3]);
		const handleChange = jest.fn(() => {
			list.$.forEach((item) => item);
		});

		observe(handleChange);

		delete list.$[0];
		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	// @todo: other api test like slice...
});

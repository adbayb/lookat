import { observable } from "../src";
import { observe } from "../src";

const INITIAL_OBSERVE_COUNT = 1;
let spiedSetTimeout: jest.SpyInstance;

beforeEach(() => {
	spiedSetTimeout = jest.spyOn(global, "setTimeout");

	spiedSetTimeout.mockImplementation((callback: VoidFunction) => {
		callback();
	});
});

afterEach(() => {
	spiedSetTimeout.mockReset();
});

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

test("should batch updates", () => {
	jest.useFakeTimers();

	const counter = observable(0);
	const callback = jest.fn(() => {
		counter.$;
	});
	const multipleUpdates = () => {
		counter.$++;
		counter.$++;
		counter.$++;
		counter.$++;
		counter.$++;
	};

	observe(callback);

	expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
	multipleUpdates();
	jest.runAllTimers();
	expect(callback).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
});

describe("Object", () => {
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
	test("should propage change from parent to children", () => {
		const person = observable({ firstName: "Ayoub", age: 28 });
		const handleAgeChange = jest.fn(() => person.$.age);
		const handleFirstNameChange = jest.fn(() => person.$.firstName);

		observe(handleAgeChange);
		observe(handleFirstNameChange);

		// @ts-ignore
		person.$ = {};

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

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
		expect(handleChangeWithStoredReference).toHaveBeenCalledTimes(
			INITIAL_OBSERVE_COUNT
		);
	});

	// @todo: should observe delete operations
});

describe("Array", () => {
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

describe("Map", () => {
	test("should observe mutable api (set)", () => {
		const map = observable(new Map<string, string>());
		const handleChange = jest.fn(() => {
			// @todo: should be observed only on reference change
			// But if map.$.set("key", "value")
			// The observer map.$.get("key") should be called instead
			map.$;
		});

		observe(handleChange);

		map.$.set("key", "value");

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe mutable api (clear)", () => {
		const map = observable(new Map<string, string>());
		const handleChange = jest.fn(() => {
			map.$.forEach((val) => val);
		});

		observe(handleChange);

		// @todo: avoid call if no change
		map.$.clear();

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe mutable api (delete)", () => {
		const map = observable(new Map<string, string>());
		const handleChange = jest.fn(() => {
			map.$.forEach((val) => val);
		});

		observe(handleChange);

		map.$.delete("key");

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should not observe getter api", () => {
		const map = observable(new Map<string, string>());
		const handleChange = jest.fn(() => {
			map.$.forEach((val) => val);
		});

		observe(handleChange);

		map.$.entries();
		map.$.forEach((val) => val);
		map.$.get("key");
		map.$.has("key");
		map.$.keys();
		// @todo: fix following error:
		// map.$.size;
		map.$.values();

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
	});
});

describe("Set", () => {
	test("should observe mutable api (add)", () => {
		const map = observable(new Set<string>());
		const handleChange = jest.fn(() => {
			map.$;
		});

		observe(handleChange);

		map.$.add("value");

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe mutable api (clear)", () => {
		const map = observable(new Set<string>());
		const handleChange = jest.fn(() => {
			map.$;
		});

		observe(handleChange);

		map.$.clear();

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should observe mutable api (delete)", () => {
		const map = observable(new Set<string>());
		const handleChange = jest.fn(() => {
			map.$;
		});

		observe(handleChange);

		map.$.delete("value");

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT + 1);
	});

	test("should not observe getter api", () => {
		const map = observable(new Set<string>());
		const handleChange = jest.fn(() => {
			map.$.forEach((val) => val);
		});

		observe(handleChange);

		map.$.entries();
		map.$.forEach((val) => val);
		map.$.has("key");
		map.$.keys();
		// @todo: fix following error:
		// map.$.size;
		map.$.values();

		expect(handleChange).toHaveBeenCalledTimes(INITIAL_OBSERVE_COUNT);
	});
});

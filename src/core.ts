/* eslint-disable @typescript-eslint/no-explicit-any, no-prototype-builtins */
export type Observable<Value> = { $: Value };

export type Observer = VoidFunction;

type PropertyKey = string | number | symbol;

type Target = Record<PropertyKey, any>;

type ObservableSource<Value> = Value | (() => Value);

type MutationQueue = Array<{ type: "set" | "delete"; keyPath: PropertyKey[] }>;

type MutationHandler = (data: MutationQueue) => void;

type Context = {
	currentObserver: Observer | null;
	observersByObservable: WeakMap<Target, Record<PropertyKey, Observer[]>>;
	currentMutationBatch: {
		id: ReturnType<typeof setTimeout> | undefined;
		observerQueue: Set<Observer>;
		mutationQueue: MutationQueue;
	};
};

const context: Context = {
	currentObserver: null,
	observersByObservable: new WeakMap(),
	currentMutationBatch: {
		id: undefined,
		observerQueue: new Set(),
		mutationQueue: [],
	},
};

const isObject = (value: unknown): value is Target => {
	return typeof value === "object" && value !== null;
};

const isNativePropertyKey = (key: PropertyKey) => {
	return [Object, Array, Map, Set].some((Ctr) =>
		Ctr.prototype.hasOwnProperty(key)
	);
};

// @note: cast to string since symbol cannot be yet used as index in TypeScript...
// @see: https://github.com/microsoft/TypeScript/issues/1863
const lookAtFootprintSymbol = Symbol("LookAt") as unknown as string;

const createProxyHandler = (
	rootKeyPath: PropertyKey[],
	onMutation?: MutationHandler
): ProxyHandler<Target> => {
	const getKeyPath = (key: PropertyKey) => {
		return [...rootKeyPath, key];
	};

	// @todo: move this function outside createProxyHandler to avoid uneeded closure memory extra allocation
	const handleMutation = (
		type: "set" | "delete",
		target: Target,
		key: PropertyKey
	) => {
		const keyPath = getKeyPath(key);
		const { observersByObservable, currentMutationBatch } = context;
		const targetObservers = observersByObservable.get(target);

		currentMutationBatch.mutationQueue.push({ type, keyPath });

		// @section: batched mutations management
		// @todo: Batch onChange + Batch delete operations
		// @todo: refactor to share mutation logic between set and delete
		if (targetObservers) {
			const observers = targetObservers[key];

			if (observers) {
				observers.forEach((observer) =>
					currentMutationBatch.observerQueue.add(observer)
				);

				if (type === "delete") {
					delete targetObservers[key];
				}
			}
		}

		if (currentMutationBatch.id) {
			clearTimeout(currentMutationBatch.id);
		}

		currentMutationBatch.id = setTimeout(() => {
			currentMutationBatch.observerQueue.forEach((observer) =>
				observer()
			);
			onMutation?.(currentMutationBatch.mutationQueue);

			currentMutationBatch.observerQueue.clear();
			currentMutationBatch.mutationQueue = [];
		}, 0);
	};

	return {
		// @note: key cast to custom PropertyKey (string | number) to avoid errors due to https://github.com/microsoft/TypeScript/issues/1863
		get(target, key: PropertyKey, ...restArgs) {
			if (key === lookAtFootprintSymbol) {
				return true;
			}

			const { currentObserver } = context;
			const value = Reflect.get(target, key, ...restArgs);

			if (
				currentObserver &&
				// @note: we do not observer native built-in function (since stable in normal conditions)
				!(isNativePropertyKey(key) && typeof value === "function")
			) {
				const callbacks =
					context.observersByObservable.get(target) || {};
				// @note: we map current observer to all traversed properties (not only the last accessed property)
				// to allow nested observers to be notified in case of parent properties reset.
				// For example, if we have following observable shape: person = { firstName: "Ayoub", age: 28 }
				// If we reset its nested values via person.$ = {}, We expect that observers associated to "firstName" and "age" property are called.
				// Mapping also their observers to the $ parent property allows to call their associated `observe` callbacks and
				// recompute their new observers dependency list to track future updates:
				const propertyCallbacks = callbacks[key] || [];

				if (!propertyCallbacks.includes(currentObserver)) {
					propertyCallbacks.push(currentObserver);
					callbacks[key] = propertyCallbacks;

					context.observersByObservable.set(target, callbacks);

					if (value instanceof Set || value instanceof Map) {
						context.observersByObservable.set(value, callbacks);
					}
				}
			}

			if (isObject(value)) {
				if (!value[lookAtFootprintSymbol]) {
					// @note: we memoize the proxy affectation inside the target object
					// to avoid recreating new proxy eac time we try to access to a given property
					target[key] = new Proxy(
						value,
						createProxyHandler(getKeyPath(key), onMutation)
					);
				}

				return target[key];
			}

			// @todo: https://stackoverflow.com/questions/43236329/why-is-proxy-to-a-map-object-in-es2015-not-working
			if (
				typeof value === "function" &&
				(target instanceof Set || target instanceof Map)
			) {
				const mutableMapSetAPI: PropertyKey[] = [
					// Map + Set
					"clear",
					"delete",
					// Set specific
					"add",
					// Map specific:
					"set",
				];

				if (mutableMapSetAPI.includes(key)) {
					handleMutation("set", target, "$");
				}

				// @note: this line fixes Map/Set error but it lead to array push regression:
				return value.bind(target);
			}

			return value;
		},
		set(target, key: PropertyKey, ...restArgs) {
			const prevValue = target[key];
			// @note: we mutate before notifying to let observers get mutated value
			const result = Reflect.set(target, key, ...restArgs);
			const newValue = target[key];
			const needsUpdate = isNativePropertyKey(key)
				? // @note: some set trap are called too late after their mutation
				  // for example, when a new item is pushed in the array, the set handler for the new item addition is triggered
				  // and, in the same time that the new value is added, the `length` property is also updated (at least in chrome) without waiting that its handler is called.
				  // Only after the set handler for `length` is triggered. The issue is that when the `length` set trap is called, the old value corresponds to the new one
				  // => the needsUpdate flag is set to false resulting in a no-op update for observers watching the `length` property updates
				  // (for example, iterators like forEach but also other native array methods that relies on length property to manage its logic).
				  // To solve it, we exclude native property from the `needsUpdate` flag evaluation: an update will be always needed for native property key (Object and Array).
				  // It should not give false positives since native property key setters might always come from a mutation but we need to be vigilant about this potential issue source...
				  true
				: prevValue !== newValue;

			if (!needsUpdate) {
				return result;
			}

			handleMutation("set", target, key);

			return result;
		},
		deleteProperty(target, key: string | number | symbol, ...restArgs) {
			const needsUpdate = key in target;
			const result = Reflect.deleteProperty(target, key, ...restArgs);

			if (!needsUpdate) {
				return result;
			}

			handleMutation("delete", target, key);

			return result;
		},
	};
};

const createObserver = (callback: VoidFunction): Observer => {
	const observer = () => {
		// @note: we collect all observer dependencies (eg. observables) each time the callback is fired
		// by making sure to set the observer as the current global one (throughout context object)
		// each time the callback is fired (thanks to corresponding dependency proxy setter/getter traps):
		context.currentObserver = observer;
		callback();
		context.currentObserver = null;
	};

	return observer;
};

export const observe = (callback: VoidFunction) => {
	// @note: if we've already a callback set, it means that we're inside a nested observer case
	// We ignore the nested observer by calling it without observer logic modifications
	// and keep the root observer as the single source of truth for the currentObserver:
	if (context.currentObserver) {
		callback();

		return;
	}

	createObserver(callback)();
};

export const createObservable = <Value>(
	value: ObservableSource<Value>,
	onMutation?: MutationHandler
) => {
	const observableValue = new Proxy(
		{ $: typeof value !== "function" ? value : undefined },
		createProxyHandler([], onMutation)
	) as Observable<Value>;

	if (typeof value === "function") {
		observe(() => {
			observableValue.$ = (value as () => Value)();
		});
	}

	return observableValue;
};

export const observable = <Value>(value: ObservableSource<Value>) =>
	createObservable(value);

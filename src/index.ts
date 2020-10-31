/* eslint-disable no-prototype-builtins */
export type Observable<Value> = { $: Value };

export type Observer = VoidFunction;

type Target = Record<PropertyKey, unknown>;

type Context = {
	currentObserver: Observer | null;
	observers: WeakMap<Target, Record<string, Observer[]>>;
	proxies: WeakMap<Target, Target>;
};

const context: Context = {
	currentObserver: null,
	observers: new WeakMap(),
	proxies: new WeakMap(),
};

const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

const isNativePropertyKey = (key: PropertyKey) => {
	return (
		Object.prototype.hasOwnProperty(key) ||
		Array.prototype.hasOwnProperty(key)
	);
};

const createProxyHandler = (
	eventHandlers?: ObservableHandlers
): ProxyHandler<Target> => {
	return {
		get(target, key: string | number, ...restArgs) {
			const { currentObserver } = context;
			const value = target[key];

			// console.log(`get->${key}`);

			if (
				currentObserver &&
				// @note: we do not observer native built-in function (since stable in normal conditions)
				!(isNativePropertyKey(key) && typeof target[key] === "function")
			) {
				const callbacks = context.observers.get(target) || {};
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

					context.observers.set(target, callbacks);
				}
			}

			if (typeof eventHandlers?.onRead === "function") {
				eventHandlers.onRead(target, key, value);
			}

			return isObject(value)
				? proxify(value, eventHandlers)
				: Reflect.get(target, key, ...restArgs);
		},
		set(target, key: string | number, ...restArgs) {
			const oldValue = target[key];
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
				: oldValue !== newValue;
			const observers = context.observers.get(target)?.[key];

			// console.warn(`set->${key}`);

			if (needsUpdate) {
				if (typeof eventHandlers?.onUpdate === "function") {
					eventHandlers.onUpdate(target, key, oldValue, newValue);
				}

				if (observers) {
					observers.forEach((observer) => observer());
				}
			}

			return result;
		},
		deleteProperty(target, key: string | number, ...restArgs) {
			const result = Reflect.deleteProperty(target, key, ...restArgs);
			const targetObservers = context.observers.get(target);

			if (typeof eventHandlers?.onDelete === "function") {
				eventHandlers.onDelete(target, key);
			}

			if (targetObservers) {
				const observers = targetObservers?.[key];

				if (observers) {
					observers.forEach((observer) => observer());
					delete targetObservers[key];
				}
			}

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

const proxify = (
	target: Target,
	// if eventHandlers is defined the first time <=> we're at the root level
	eventHandlers?: ObservableHandlers
): Target => {
	const storedProxy = context.proxies.get(target);

	if (storedProxy) {
		return storedProxy;
	}

	const proxy = new Proxy(target, createProxyHandler(eventHandlers));

	context.proxies.set(target, proxy);

	return proxy;
};

type ObservableSource<Value> = Value | (() => Value);

type ObservableHandlers = {
	onUpdate?: (
		target: Target,
		key: PropertyKey,
		oldValue: unknown,
		newValue: unknown
	) => void;
	onDelete?: (target: Target, key: PropertyKey) => void;
	onRead?: (target: Target, key: PropertyKey, value: unknown) => void;
};

export const createObservable = <Value>(
	value: ObservableSource<Value>,
	eventHandlers?: ObservableHandlers
) => {
	const observableValue = proxify(
		{ $: typeof value !== "function" ? value : undefined },
		eventHandlers
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

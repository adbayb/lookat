/* eslint-disable no-prototype-builtins */
export type Observable<Value> = { $: Value };

export type Observer = VoidFunction;

type Target = Record<string, unknown>;

type Context = {
	currentObserver: Observer | null;
	observers: WeakMap<Target, Record<string, Observer[]>>;
	proxies: WeakMap<Target, Target>;
};

export const context: Context = {
	currentObserver: null,
	observers: new WeakMap(),
	proxies: new WeakMap(),
};

const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

const isNativeFunction = (target: Record<string, unknown>, key: string) => {
	const isNativePropertyKey =
		Object.prototype.hasOwnProperty(key) ||
		Array.prototype.hasOwnProperty(key);

	return isNativePropertyKey && typeof target[key] === "function";
};

class ObservableHandler<Value extends Record<string, unknown>>
	implements ProxyHandler<Value> {
	eventHandlers?: ObservableHandlers;

	constructor(eventHandlers?: ObservableHandlers) {
		this.eventHandlers = eventHandlers;
	}

	get(...args: Parameters<NonNullable<ProxyHandler<Value>["get"]>>) {
		const { currentObserver } = context;
		const target = args[0];
		const key = args[1] as string;
		const value = target[key];

		// console.log(`get->${key}`, target, target[key]);

		if (currentObserver && !isNativeFunction(target, key)) {
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

		if (typeof this.eventHandlers?.onGet === "function") {
			this.eventHandlers.onGet(target, key, value);
		}

		return isObject(value)
			? proxify(value, this.eventHandlers)
			: Reflect.get(...args);
	}

	set(...args: Parameters<NonNullable<ProxyHandler<Value>["set"]>>) {
		const target = args[0];
		const key = args[1] as string | number;
		const oldValue = target[key];
		// @note: we mutate before notifying to let observers get mutated value
		const newValue = Reflect.set(...args);
		const needsUpdate = oldValue !== target[key];
		const observers = context.observers.get(target)?.[key];

		// console.warn(`set->${key}`, ...args);

		if (needsUpdate) {
			if (typeof this.eventHandlers?.onSet === "function") {
				this.eventHandlers.onSet(target, key, oldValue, newValue);
			}

			if (observers) {
				observers.forEach((observer) => observer());
			}
		}

		return newValue;
	}

	deleteProperty(
		...args: Parameters<NonNullable<ProxyHandler<Value>["deleteProperty"]>>
	) {
		const target = args[0];
		const key = args[1] as string | number;
		const result = Reflect.deleteProperty(...args);
		const targetObservers = context.observers.get(target);

		if (typeof this.eventHandlers?.onDeleteProperty === "function") {
			this.eventHandlers.onDeleteProperty(target, key);
		}

		if (targetObservers) {
			const observers = targetObservers?.[key];

			if (observers) {
				observers.forEach((observer) => observer());
				delete targetObservers[key];
			}
		}

		return result;
	}
}

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
	eventHandlers?: ObservableHandlers
): Target => {
	const storedProxy = context.proxies.get(target);

	if (storedProxy) {
		return storedProxy;
	}

	const proxy = new Proxy(target, new ObservableHandler(eventHandlers));

	context.proxies.set(target, proxy);

	return proxy;
};

type ObservableSource<Value> = Value | (() => Value);

type ObservableHandlers = {
	onSet?: (
		target: Target,
		key: PropertyKey,
		oldValue: unknown,
		newValue: unknown
	) => void;
	onDeleteProperty?: (target: Target, key: PropertyKey) => void;
	onGet?: (target: Target, key: PropertyKey, value: unknown) => void;
};

export const createObservable = <Value>(
	value: ObservableSource<Value>,
	eventHandlers?: ObservableHandlers
): Observable<Value> => {
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

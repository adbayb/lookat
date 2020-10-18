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

class ObservableHandler<Value extends Record<string, unknown>>
	implements ProxyHandler<Value> {
	get(...args: Parameters<NonNullable<ProxyHandler<Value>["get"]>>) {
		const { currentObserver } = context;
		const target = args[0];
		const key = args[1] as string;
		const value = target[key];

		// console.log(`get->${key}`, target, target[key]);

		// @section: observer subscriptions
		if (currentObserver) {
			const callbacks = context.observers.get(target) || {};
			// @note: we map current observer to all traversed properties (not only the last accessed property)
			// to allow nested observers to be notified in case of parent properties reset.
			// For example, if we have following observable shape: person = { firstName: "Ayoub", age: 28 }
			// If we reset its nested values via person.$ = {}, We expect that observers associated to "firstName" and "age" property are called.
			// Mapping also their observers to the $ parent property allows to call their associated `observe` callbacks and
			// recompute their new observers dependency list to track future updates:
			// @note: callbacks.hasOwnProperty(key) to avoid getting value from the prototype chain. In fact, callbacks is an Object and
			// if the current key is the same as one of its Object instance (for example `constructor`), relying only with `callbacks[key]`
			// will assign the native `constructor` method of callbacks to the `propertyCallbacks` variable.
			// By checking if `constructor` is the own property of `callbacks` (eg. not inheriting it), we target
			// the property that was added by the proxy manager and not the one from the parent Object instance:
			const propertyCallbacks =
				// eslint-disable-next-line no-prototype-builtins
				(callbacks.hasOwnProperty(key) && callbacks[key]) || [];

			if (!propertyCallbacks.includes(currentObserver)) {
				propertyCallbacks.push(currentObserver);
				callbacks[key] = propertyCallbacks;

				context.observers.set(target, callbacks);
			}
		}

		return isObject(value) ? proxify(value) : Reflect.get(...args);
	}

	set(...args: Parameters<NonNullable<ProxyHandler<Value>["set"]>>) {
		const target = args[0];
		const key = args[1] as string;
		// @note: we mutate before notifying to let observers get mutated value
		const result = Reflect.set(...args);
		const observers = context.observers.get(target)?.[key];

		// console.warn(`set->${key}`, target, context.observers);

		// @section: notify
		if (observers) {
			observers.forEach((observer) => observer());
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

const proxify = (target: Target): Target => {
	const storedProxy = context.proxies.get(target);

	if (storedProxy) {
		return storedProxy;
	}

	const proxy = new Proxy(target, new ObservableHandler());

	context.proxies.set(target, proxy);

	return proxy;
};

const createObservable = <Value>(value: Value): Observable<Value> => {
	return proxify({ $: value }) as Observable<Value>;
};

// @todo: object, array, ...
export const observable = <Value>(
	value: Value | (() => Value)
): Observable<Value> => {
	/*
	// @todo: check feasability of:
	const proxifiedObj = new Proxy({ $: value }, new ObservableHandler());
	return proxifiedObj.$
	// And consumer side: let counter = observable(0); counter++; Instead of counter.$++
	*/

	// @todo: test for following condition
	if (context.currentObserver) {
		throw new Error(
			"`observable` value must not be affected inside an `observe` callback"
		);
	}

	if (typeof value !== "function") {
		return createObservable(value);
	}

	const computedObservable: Observable<Value> = createObservable(undefined!);

	observe(() => {
		computedObservable.$ = (value as () => Value)();
	});

	return computedObservable;
};

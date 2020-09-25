/*
Observable API:
const counter = observable(0); // returns counter.$ ($ is the reactive value accessor making the reactivity explicit in the naming). To mutate, use `counter.$++` for example
const person = observable({ firstname: "Ayoub", age: 28 }); // returns counter.$.age...

Observe API:
const voidValue = observe(() => console.log(counter * 2)); // side effects
const isPair = observe(() => counter % 2 === 0); // computed reactive value => returns observable value
observe(() => {
	console.log(isPair.$)
})

Utilities API:
unwrap(isPair) // returns raw value of an observable
*/

/*
TODO:

- Enable more granular proxy for objects (per properties)
- Enable Array/Map/WeakMap/Set observables (+ add tests)
- Do not call observers if impacted value is not modified (check inside the setter trap)
- Optimize Proxy wrapping => do not use observe api but instead observable api to define derived observables as well:
const counter = observable(0)
const counterSquare = observable(counter.$ * 2)

- Optimize same observer calls if the side effect relies on computed observables:
const counter = observable(0);
const counterSquare = observe(() => counter.$ * 2);
observe(() => {
	console.log("Counter Quatro = ", counter.$, " ", counterSquare.$);
});
// => Currently, it's called two times since the observer relies on two observables but it could be improved with some predicates to be called once

- Performance/Memory benchmark
- Readme + Hosted documentation
*/

export type Observable<Value> = { $: Value };

// Observer should not return a function (no closure ! It can lead to untrack items since we don't call the return function)
// @todo: typing + runtime warning
type Observer = VoidFunction;

type Target = Record<string, unknown>;

type Context = {
	currentObserver: Observer | null;
	observers: WeakMap<Target, Record<string, Observer[]>>;
	// @todo: remove proxies (needed only to prevent creating multiple instances of proxies)
	// Might be better and less memory consuming to store an extra private proxy property to check if we've already a proxy
	// @see: https://stackoverflow.com/questions/41299642/how-to-use-javascript-proxy-for-nested-objects
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

class ObservableHandler<Value extends Record<string, unknown>>
	implements ProxyHandler<Value> {
	get(...args: Parameters<NonNullable<ProxyHandler<Value>["get"]>>) {
		const [target, key] = args;
		const { currentObserver } = context;
		const objectKey = key.toString();
		const value = target[objectKey];

		// @section: subscribe
		if (currentObserver) {
			// console.log(`get->${objectKey}`, target, target[objectKey]);
			const rootCallbacks = context.observers.get(target) || {};
			// @note: we map current observer to all traversed properties (not only the last accessed property)
			// to allow nested observers to be notified in case of parent properties reset.
			// For example, if we have following observable shape: person = { firstName: "Ayoub", age: 28 }
			// If we reset its nested values via person.$ = {}
			// We expect that observers associated to "firstName" and "age" property are called
			// Mapping also the observers to $ parent property allows to call those observers and create new proxy around the empty reset object
			// to track future updates:
			const propertyCallbacks = rootCallbacks[objectKey] || [];

			if (!propertyCallbacks.includes(currentObserver)) {
				propertyCallbacks.push(currentObserver);
				rootCallbacks[objectKey] = propertyCallbacks;

				context.observers.set(target, rootCallbacks);
			}
		}

		return isObject(value) ? proxify(value) : Reflect.get(...args);
	}

	set(...args: Parameters<NonNullable<ProxyHandler<Value>["set"]>>) {
		const [target, key] = args;
		// @note: we mutate before notifying to let observers get mutated value
		const result = Reflect.set(...args);
		const observers = context.observers.get(target)?.[key.toString()];
		// console.warn(`set->${key.toString()}`, target, context);

		if (!observers) {
			return result;
		}

		// @section: notify
		observers.forEach((observer) => observer());

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
	const ctxProxy = context.proxies.get(target);

	if (ctxProxy) {
		return ctxProxy;
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

setTimeout(() => {
	console.log(context);
}, 1000);

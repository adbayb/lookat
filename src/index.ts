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

- Optimize same observer calls if the side effect relies on computed observables:
const counter = observable(0);
const counterSquare = observe(() => counter.$ * 2);
observe(() => {
	console.log("Counter Quatro = ", counter.$, " ", counterSquare.$);
});
// => Currently, it's called two times since the observer relies on two observables but it could be improved with some predicates to be called once

*/

type Observable<Value = unknown> = { $: Value };
// Observer should not return a function (no closure ! It can lead to untrack items since we don't call the return function)
// @todo: typing + runtime warning
type Observer<Value extends unknown = unknown> = () => Value;

type Context = {
	currentObserverCallback: VoidFunction | null;
	preventSubscriptionDuringSideEffect: boolean;
	observables: WeakMap<Record<string, unknown>, Set<Observer>>;
};

export const context: Context = {
	currentObserverCallback: null,
	preventSubscriptionDuringSideEffect: false,
	observables: new WeakMap(),
};

class ObservableHandler<Value extends Record<string, unknown>>
	implements ProxyHandler<Value> {
	get(...args: Parameters<NonNullable<ProxyHandler<Value>["get"]>>) {
		const [target] = args;
		const {
			currentObserverCallback,
			preventSubscriptionDuringSideEffect,
		} = context;

		// @note: we only attach the observer if observable is retrieved within an observer
		if (currentObserverCallback && !preventSubscriptionDuringSideEffect) {
			// @section: subscribe
			let observers = context.observables.get(target);

			if (!observers) {
				observers = new Set();
			}

			observers.add(currentObserverCallback);
			context.observables.set(target, observers);
		}

		return Reflect.get(...args);
	}

	set(...args: Parameters<NonNullable<ProxyHandler<Value>["set"]>>) {
		const [target] = args;
		// @note: we mutate before notifying to let observers get mutated value
		const result = Reflect.set(...args);
		const observers = context.observables.get(target);

		if (!observers) {
			return result;
		}

		// @section: notify
		// @note: to avoid infinite loop while triggering external observer side effects during a given observer call
		context.preventSubscriptionDuringSideEffect = true;
		observers.forEach((observer) => observer());
		context.preventSubscriptionDuringSideEffect = false;

		return result;
	}
}

export const observable = <Value>(value: Value): Observable<Value> => {
	return new Proxy({ $: value }, new ObservableHandler());
};

export const observe = <CallbackReturnValue extends unknown>(
	observer: Observer<CallbackReturnValue>
): Observable<CallbackReturnValue> => {
	// @todo: optimize observable to wrap with proxy only if they're consumed inside observer or their setter is called:
	const returnedObservable = observable<CallbackReturnValue>(undefined!);

	// @note: if we've already a callback set, it means that we're inside a nested observer case
	// We ignore the nested observer and keep the root observer as the single source of truth:
	if (context.currentObserverCallback) {
		returnedObservable.$ = observer();

		return returnedObservable;
	}

	context.currentObserverCallback = () => {
		// @note: collect observables via the first call
		// and keep updating the computed value if needed:
		// @todo: optimize here to not always wrap the return value with a proxy?
		returnedObservable.$ = observer();
	};
	context.currentObserverCallback();
	context.currentObserverCallback = null;

	return returnedObservable;
};

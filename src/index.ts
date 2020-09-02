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

type Observable<Value = unknown> = { $: Value };
// Observer should not return a function (no closure ! It can lead to untrack items since we don't call the return function)
// @todo: typing + runtime warning
type Observer<Value extends unknown = unknown> = () => Value;

type Context = {
	currentObserverData: {
		observer: Observer;
		returnedObservable: Observable;
	} | null;
	preventSubscriptionDuringSideEffect: boolean;
	observables: WeakMap<
		Record<string, unknown>,
		Set<NonNullable<typeof context.currentObserverData>>
	>;
};

export const context: Context = {
	currentObserverData: null,
	preventSubscriptionDuringSideEffect: false,
	observables: new WeakMap(),
};

class ObservableHandler<Value extends Record<string, unknown>>
	implements ProxyHandler<Value> {
	get(...args: Parameters<NonNullable<ProxyHandler<Value>["get"]>>) {
		const [target] = args;
		const {
			currentObserverData,
			preventSubscriptionDuringSideEffect,
		} = context;

		// @note: we only attach the observer if observable is retrieved within an observer
		if (currentObserverData && !preventSubscriptionDuringSideEffect) {
			// @section: subscribe
			let observers = context.observables.get(target);

			if (!observers) {
				observers = new Set();
			}

			// @todo: investigate issue with nested observers which recreate new callback at each call
			// leading to duplicate function subscription even if no logic inside change
			observers.add(currentObserverData);
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
		observers.forEach(({ observer, returnedObservable }) => {
			returnedObservable.$ = observer();
		});
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

	// @note: if we've already a currentObserverData set, it means that we're inside a nested observer case
	// We ignore the nested observer and keep the root observer as the single observer source of truth:
	if (!context.currentObserverData) {
		context.currentObserverData = {
			observer,
			returnedObservable,
		};
		// @note: collect observables via the first call
		returnedObservable.$ = observer();
		context.currentObserverData = null;
	} else {
		// @todo: throw error
		// We don't accept nested observer (unexpected behavior (what's the behavior for observable returned by nested observers?) and complexify memory efficient management)
		observer();
	}

	return returnedObservable;
};

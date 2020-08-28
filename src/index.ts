type ObserverCallback = VoidFunction;

class Observer {
	callback: ObserverCallback;
	// @note: the graal will be to use WeakRef with WeakMap to avoid possible memory leak
	// The compatibility is not yet good enough (maybe progressive enhancement when available?)
	observables: Observable[];
	// @note: double linked list to manage nested observers
	next: Observer | null;
	previous: Observer | null;

	constructor(callback: VoidFunction) {
		this.callback = callback;
		this.observables = [];
		this.next = null;
		this.previous = null;
	}

	subscribe(observable: Observable) {
		if (!this.observables.includes(observable)) {
			this.observables.push(observable);
			observable.attach(this);
		}
	}

	unsubscribe() {
		const numberOfObservables = this.observables.length;

		for (let i = 0; i < numberOfObservables; i++) {
			this.observables[i].detach(this);
		}

		this.observables = [];
	}
}

class Observable {
	observers: Observer[];

	constructor() {
		this.observers = [];
	}

	notify() {
		const numberOfObservers = this.observers.length;

		for (let i = 0; i < numberOfObservers; i++) {
			this.observers[i].callback();
		}
	}

	attach(observer: Observer) {
		this.observers.push(observer);
	}

	detach(observer: Observer) {
		this.observers = this.observers.filter((obs) => obs !== observer);
	}
}

type Context = {
	currentObserver: Observer | null;
};

const context: Context = {
	currentObserver: null,
};

export const observable = <Value>(value: Value) => {
	const observable = new Observable();
	const returnValue = { value };
	const handler: ProxyHandler<typeof returnValue> = {
		get(...args) {
			const { currentObserver } = context;

			// @note: we only attach the observer if observable is retrieved within an observer
			if (currentObserver) {
				currentObserver.subscribe(observable);
			}

			return Reflect.get(...args);
		},
		set(...args) {
			// @note: we mutate before notifying to let observers get mutated value
			const result = Reflect.set(...args);

			// @note: we execute side effect on next tick to avoid infinite loop:
			setTimeout(() => observable.notify(), 0);

			return result;
		},
	};

	return new Proxy(returnValue, handler);
};

// @todo: memoize the callback but for this callback should be defined statically
// @todo: to warn about this restriction: add readme disclaimer to avoid conditional callback inside definition
// provided as parameter logic (for example: observer(isTrue ? callback1 : callback2))
export const observer = (callback: ObserverCallback) => {
	const observer = new Observer(callback);

	if (context.currentObserver) {
		context.currentObserver.next = observer;
		observer.previous = context.currentObserver;
	}

	// @note: collect observables via the first call
	context.currentObserver = observer;
	callback();
	context.currentObserver = null;
	console.log(observer);

	return () => {
		// @note: traverse the linked list to unsuscribe all nested observers
		let observerCursor = observer.next;

		while (observerCursor !== null) {
			observerCursor.unsubscribe();
			observerCursor = observerCursor.next;
			console.log("END");
		}

		// @note: unscribe the root observer
		// @todo: set next and previous to null inside unsubscribe function
		observer.unsubscribe();
	};
};

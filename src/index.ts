type ObserverCallback = VoidFunction;

class Observer {
	callback: ObserverCallback;
	observables: Observable[];

	constructor(callback: VoidFunction) {
		this.callback = callback;
		this.observables = [];
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
		// this.orchestrator = orchestrator;
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

	// @todo: remove observer
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

			// @note: we only attach the observer if we get the value inside it
			if (currentObserver) {
				currentObserver.subscribe(observable);
			}

			return Reflect.get(...args);
		},
		set(...args) {
			// @note: we mutate before notifying to let observers get mutated value
			const result = Reflect.set(...args);

			observable.notify();

			return result;
		},
	};

	return new Proxy(returnValue, handler);
};

export const observer = (callback: ObserverCallback) => {
	const observer = new Observer(callback);

	// @note: collect observables via the first call
	// @todo: weakmap<observer, true> for the type of observable.observers (it will be autoclean by gc and no memory leak :))
	context.currentObserver = observer;
	callback();
	context.currentObserver = null;

	return () => {
		observer.unsubscribe();
	};
};

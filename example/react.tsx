import {
	FunctionComponent,
	ReactElement,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Observer, observable, observe } from "../src";

const useForceUpdate = () => {
	const [, forceUpdate] = useState(0);

	return () => forceUpdate((x) => x + 1);
};

export const lookAt = (MyComponent: FunctionComponent) => {
	return function LookAt(props: Record<string, unknown>) {
		const [element, setElement] = useState<ReactElement | null>(() => {
			let instance: ReactElement | null = null;

			observe(() => {
				// @todo: manage forwardRef (second arg)
				instance = MyComponent(props);

				if (typeof setElement === "function") {
					setElement(instance);
				}
			});

			return instance;
		});

		return element;
	};
};

// @note: not useful for non primitive observable. Since we track only the parent update (via the root property .$)
// For example, if we have a property `child` (observable.$.child) and the child property is updated, the following
// hook won't trigger a rerender:
export const useObservable = <Value extends unknown>(value: Value) => {
	const forceUpdate = useForceUpdate();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const observedValue = useMemo(() => observable(value, forceUpdate), []);

	return observedValue;
};

export const useObserver = (observer: Observer) => {
	useEffect(() => {
		observe(observer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
};

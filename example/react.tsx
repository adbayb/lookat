import { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { Observable, observe } from "../src";

const useForceUpdate = () => {
	const [, forceUpdate] = useState<Record<string, unknown>>();

	return () => forceUpdate({});
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
export const useLookAt = <Value extends unknown>(
	observable: Observable<Value>
) => {
	const forceUpdate = useForceUpdate();

	useEffect(() => {
		observe(() => {
			observable.$;
			forceUpdate();
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
};

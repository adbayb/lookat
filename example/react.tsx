import { FunctionComponent, createElement, useEffect, useState } from "react";
import { Observable, observe } from "../src";

const useForceUpdate = () => {
	const [, forceUpdate] = useState<Record<string, unknown>>();

	return () => forceUpdate({});
};

export const lookAt = (MyComponent: FunctionComponent) => {
	return function LookAt(props: Record<string, unknown>) {
		const forceUpdate = useForceUpdate();

		useEffect(() => {
			observe(() => {
				// @note: It's necessary to create a temporary new component instance each time the observer is called to allow tracking dependencies
				// Using setState(<Component {...props} />) to avoid multiple component logic call won't allow tracking dependencies
				// since <Component {...props} /> is transpiled to createElement(MyComponent, props)
				// The createElement receives the functional component `MyComponent` as argument
				// but the function is not yet called (eg. MyComponent(props)) until the next render tick (after useEffect)
				// @todo: what about logic inside a component constructor (like fetching data?) => we'll side effects since we call component 2 times
				MyComponent(props);
				forceUpdate();
			});
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);

		return createElement(MyComponent, props);
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

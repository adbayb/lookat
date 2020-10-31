import { useEffect, useMemo, useState } from "react";
import { Observer, createObservable, observe } from "../src";

// @note: not useful for non primitive observable. Since we track only the parent update (via the root property .$)
// For example, if we have a property `child` (observable.$.child) and the child property is updated, the following
// hook won't trigger a rerender:
export const useObservable = <Value extends unknown>(value: Value) => {
	const [, forceUpdate] = useState(0);
	const commitUpdate = () => forceUpdate((x) => x + 1);

	const observableValue = useMemo(
		() =>
			createObservable(value, {
				onSet: commitUpdate,
				onDeleteProperty: commitUpdate,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return observableValue;
};

export const useObserver = (observer: Observer) => {
	useEffect(() => {
		observe(observer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
};

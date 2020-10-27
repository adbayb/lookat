import { useEffect, useMemo, useState } from "react";
import { Observer, observable, observe } from "../src";

// @note: not useful for non primitive observable. Since we track only the parent update (via the root property .$)
// For example, if we have a property `child` (observable.$.child) and the child property is updated, the following
// hook won't trigger a rerender:
export const useObservable = <Value extends unknown>(value: Value) => {
	const [, forceUpdate] = useState(0);
	const globalObserver = () => forceUpdate((x) => x + 1);

	const observableValue = useMemo(
		() => observable(value, globalObserver),
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

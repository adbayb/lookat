import { useEffect, useMemo, useState } from "react";
import { Observer, createObservable, observe } from "./core";

// @note: not useful for non primitive observable. Since we track only the parent update (via the root property .$)
// For example, if we have a property `child` (observable.$.child) and the child property is updated, the following
// hook won't trigger a rerender:
export const useObservable = <Value extends unknown>(value: Value) => {
	const [, forceUpdate] = useState(0);
	const commitUpdate = () => forceUpdate((x) => x + 1);

	return useMemo(() => {
		return createObservable(value, function handleMutation() {
			// ...args
			commitUpdate();
		});
	}, []);
};

export const useObserver = (observer: Observer) => {
	useEffect(() => {
		observe(observer);
	}, []);
};

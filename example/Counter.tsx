import * as React from "react";
import { Observable, observable, observe } from "../src";

const counter = observable(0);
const derivedCounter = observable(() => counter.$ * 2);

setInterval(() => {
	counter.$++;
}, 1000);

observe(() => {
	observe(() => {
		counter.$ * 4;
	});
	console.log("Nested", counter.$);
});

observe(() => {
	console.log("Computed", derivedCounter.$);
});

const useObservable = <Value extends unknown>(
	observableValue: Observable<Value>
) => {
	const [uiValue, setUIValue] = React.useState(observableValue.$);

	React.useEffect(() => {
		observe(() => {
			setUIValue(observableValue.$);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return uiValue;
};

export const Counter = () => {
	const value = useObservable(counter);

	return <span>{value}</span>;
};

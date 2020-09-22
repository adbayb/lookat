import * as React from "react";
import { Observable, observe } from "../src";

export const useObservable = <Value extends unknown>(
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

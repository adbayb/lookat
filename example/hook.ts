import * as React from "react";
import { Observable, observe } from "../src";

export const useObservable = <Value extends unknown>(
	observableValue: Observable<Value>
) => {
	const state = React.useState(observableValue.$);

	React.useEffect(() => {
		observe(() => {
			state[1](observableValue.$);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return observableValue;
};

import * as React from "react";
import { observable, observe } from "../src";

const counter = observable(0);
const counterSquare = observe(() => counter.$ * 2);

setInterval(() => {
	counter.$++;
}, 1000);
observe(() => {
	console.log(counterSquare.$);
});

export const Counter = () => {
	const [element, setElement] = React.useState<JSX.Element>();

	React.useEffect(() => {
		observe(() => {
			setElement(<span>{counter.$}</span>);
		});
	}, []);

	return <>{element} Plop</>;
};

import * as React from "react";
import { observable, observe } from "../src";

const counter = observable(0);
// const counterSquare = observe(() => counter.$ * 2);

setInterval(() => {
	counter.$++;
}, 1000);

const nestedComputed = observe(() => {
	const nested = observe(() => {
		return counter.$ * 4;
	});

	return nested.$;
});

observe(() => {
	console.log("Nested", nestedComputed.$);
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

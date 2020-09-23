import * as React from "react";
import { observable, observe } from "../src";
import { useObservable } from "./hook";

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

export const Counter = () => {
	const value = useObservable(counter);

	return (
		<div>
			<span>Value: {value.$}</span>
			<div
				style={{
					marginTop: 8,
					display: "grid",
					gridGap: 8,
					gridTemplateColumns: "max-content max-content auto",
				}}
			>
				<button onClick={() => value.$++}>Increment</button>
				<button onClick={() => value.$--}>Decrement</button>
				<button onClick={() => (value.$ = 0)}>Reset</button>
			</div>
		</div>
	);
};

import * as React from "react";
import { observable, observe } from "../src";
import { lookAt } from "./react";

const counter = observable(0);
const derivedCounter = observable(() => counter.$ * 2);

setInterval(() => {
	counter.$++;
}, 1000);

observe(() => {
	console.log("Counter:", counter.$);
});

observe(() => {
	console.log("Computed:", derivedCounter.$);
});

export const Counter = lookAt(function Counter() {
	return (
		<div>
			<span>Value: {counter.$}</span>
			<div
				style={{
					marginTop: 8,
					display: "grid",
					gridGap: 8,
					gridTemplateColumns: "max-content max-content auto",
				}}
			>
				<button onClick={() => counter.$++}>Increment</button>
				<button onClick={() => counter.$--}>Decrement</button>
				<button onClick={() => (counter.$ = 0)}>Reset</button>
			</div>
		</div>
	);
});

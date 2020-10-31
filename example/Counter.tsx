import * as React from "react";
import { useObservable, useObserver } from "./react";

// setInterval(() => {
// 	counter.$++;
// }, 1000);

export const Counter = () => {
	const counter = useObservable(0);
	const derivedCounter = useObservable(() => counter.$ * 2);

	console.warn("Render");

	useObserver(() => {
		// @tofix: fix observe primitive to avoid calling observer if the next value doesn't change
		console.log("Source:", counter.$);
		// @tofix: adding another observable causes double calls
		// console.log("Computed:", derivedCounter.$);
	});

	useObserver(() => {
		console.log("Computed:", derivedCounter.$);
	});

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
};

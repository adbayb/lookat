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
		console.log("Source:", counter.$);
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

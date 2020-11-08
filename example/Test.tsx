import * as React from "react";
import { observable, observe } from "../src";

const value = observable(0);

observe(() => {
	console.log(value.$);
});

// @section: other batching opportunity

const counter = observable(0);
const counterSquare = observable(() => counter.$ * 2);

observe(() => {
	console.log("Counter = ", counter.$, " / ", counterSquare.$);
});

const add = () => {
	value.$++;
	value.$++;
	counter.$++;
};

export const Test = () => {
	return (
		<>
			<button onClick={() => add()}>
				Batch (Multiple same mutation)
			</button>
			<button onClick={() => counter.$++}>
				Batch (Original and computed mutation)
			</button>
		</>
	);
};

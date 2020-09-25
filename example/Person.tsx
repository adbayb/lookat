import * as React from "react";
import { observable, observe } from "../src";

const person = observable({ firstName: "Ayoub", age: 28 });

setInterval(() => {
	person.$.age++;
}, 1000);

observe(() => {
	console.log("Age", person.$.age);
});

observe(() => {
	console.log("FirstName", person.$.firstName);
});

// observe(() => {
// 	// @todo: should be called if children property is updated
// 	// @todo2: person.$ = { firstName: "New", age: 28 } should proxify the affected object
// 	console.log("Root", person.$);
// });

export const Person = () => {
	return (
		<div
			style={{ display: "grid", gridTemplateColumns: "1fr", gridGap: 8 }}
		>
			<span>👋</span>
			<button
				onClick={() => {
					const value = Math.random();

					person.$.firstName = value.toString();
				}}
			>
				Random FirstName
			</button>
			<button
				onClick={() => {
					// @todo: to test notifier reliability, check really deep object reset (2 nested levels for examples). For example: person.$.parent.father = {}
					// @ts-ignore
					person.$ = {};
				}}
			>
				Reset
			</button>
			<button
				onClick={() => {
					// @todo: should proxify new object in order to be tracked next time !
					// For example here, clicking on reset breaks random firstname generation if the user tries to generate it after the reset
					// @ts-ignore
					person.$ = { plop: false };
				}}
			>
				New property
			</button>
		</div>
	);
};
import * as React from "react";
import { context, observable, observe } from "../src";
import { useObservable } from "./hook";

const person = observable({ firstName: "Ayoub", age: 28 });

setInterval(() => {
	person.$.age++;
	console.warn(context);
}, 1000);

observe(() => {
	console.log("Age", person.$.age);
});

observe(() => {
	console.log("FirstName", person.$.firstName);
});

observe(() => {
	// @todo: should be called if children property is updated
	// @todo2: person.$ = { firstName: "New", age: 28 } should proxify the affected object
	console.log("Root", person.$);
});

export const Person = () => {
	const state = useObservable(person);

	return (
		<div
			style={{ display: "grid", gridTemplateColumns: "1fr", gridGap: 8 }}
		>
			<div>👋 {JSON.stringify(state)}</div>
			<button
				onClick={() => {
					const value = Math.random();

					state.$.firstName = value.toString();
				}}
			>
				Update first name - TO FIX WITH HOOK
			</button>
			<button
				onClick={() => {
					state.$.age = 0;
				}}
			>
				Reset age - TO FIX WITH HOOK
			</button>
			<button
				onClick={() => {
					state.$ = { firstName: "Unknown", age: 99 };
				}}
			>
				Change person identity (new object)
			</button>
			<button
				onClick={() => {
					// @todo: should proxify new object in order to be tracked next time !
					// For example here, clicking on reset breaks random firstname generation if the user tries to generate it after the reset
					// @ts-ignore
					state.$ = { plop: false };
				}}
			>
				Alter shape (new object with new shape)
			</button>
		</div>
	);
};

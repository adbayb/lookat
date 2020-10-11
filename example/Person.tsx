import * as React from "react";
import { observable, observe } from "../src";
import { lookAt } from "./react";

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

observe(() => {
	/* 
		@note: For now, behavior limitation => not possible to call parent property if children property is updated
		since it implies that all properties (from the parent root to the targeted children) are accessed inside the observer callback
		@todo: let parent be notified from child change 
		And check if it works with:

		const accessedFromOutside = person.$

		observe(() => {
			accessedFromOutside;
		})
	*/
	// @todo: person.$ = { firstName: "New", age: 28 } should proxify the affected object
	console.log("Root", person.$);
});

/**
 * API limitations and caveats with object like observable:
 *
 * 👉 Updates are always notified from top to bottom. Updating a child property
 * won't notify its parent observers. But a parent update (such a new reference through object affectation)
 * will notify its child property observers. And it's quite natural and aligned with JS runtime:
 * => value and reference are managed from top to bottom: a child cannot update its parent reference.
 *
 * 👉 Parent update (eg. new object affectation) will notify its child observers if and only if all accessors
 * to reach the targetted child property are specified inside the `observe` callback:
 *
 * ❌	const state = person.$
 * ❌	observe(() => { state.firstName })
 * ❌	person.$ = { firstName: "New" }
 * ❌	// The observe callback won't be called
 *
 * ✔️	observe(() => { person.$.firstName })
 * ✔️	person.$ = { firstName: "New" }
 * ✔️	// The observe callback will be called
 */

export const Person = lookAt(function Person() {
	return (
		<div
			style={{ display: "grid", gridTemplateColumns: "1fr", gridGap: 8 }}
		>
			<div>👋 {JSON.stringify(person.$)}</div>
			<button
				onClick={() => {
					const value = Math.random();

					person.$.firstName = value.toString();
				}}
			>
				Update first name - TO FIX WITH HOOK
			</button>
			<button
				onClick={() => {
					person.$.age = 0;
				}}
			>
				Reset age - TO FIX WITH HOOK
			</button>
			<button
				onClick={() => {
					person.$ = { firstName: "Unknown", age: 99 };
				}}
			>
				Change person identity (new object)
			</button>
			<button
				onClick={() => {
					// @todo: should proxify new object in order to be tracked next time !
					// For example here, clicking on reset breaks random firstname generation if the user tries to generate it after the reset
					// @ts-ignore
					person.$ = { plop: false };
				}}
			>
				Alter shape (new object with new shape)
			</button>
		</div>
	);
});

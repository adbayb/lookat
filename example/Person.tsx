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

export const Person = () => {
	return (
		<div>
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
					// @todo: should proxify new object in order to be tracked next time !
					// For example here, clicking on reset breaks random firstname generation if the user tries to generate it after the reset
					// @ts-ignore
					person.$ = {};
				}}
			>
				Reset
			</button>
		</div>
	);
};

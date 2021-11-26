import React, { useEffect } from "react";
import { useObservable, useObserver } from "../src";

export const Person = () => {
	const person = useObservable({
		firstName: "Ayoub",
		age: 28,
		children: [{ firstName: "Mohamed" }],
	});

	useEffect(() => {
		setInterval(() => {
			person.$.age++;
		}, 1000);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useObserver(() => {
		console.log("Age", person.$.age);
	});

	useObserver(() => {
		console.log("FirstName", person.$.firstName);
	});

	useObserver(() => {
		// @todo: person.$ = { firstName: "New", age: 28 } should proxify the affected object
		console.log("Root", person.$);
	});

	useObserver(() => {
		console.warn("Plop", person.$.firstName);
	});

	console.error("Render");

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
					person.$ = { firstName: "Unknown", age: 99, children: [] };
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
			<button
				onClick={() => {
					person.$.children.push({ firstName: "Sirine" });
				}}
			>
				Add child
			</button>
		</div>
	);
};

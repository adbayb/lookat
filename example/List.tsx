import React from "react";
import { useObservable, useObserver } from "./react";

export const List = () => {
	const list = useObservable(["First", "Second"]);

	useObserver(() => {
		console.log("Updated0", list.$);
	});

	useObserver(() => {
		console.log("Updated1", list.$[0]);
	});

	useObserver(() => {
		console.log("Updated2", list.$.join("/"));
	});

	useObserver(() => {
		list.$.forEach((item) => console.log("Updated3", item));
	});

	return (
		<>
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 8,
				}}
			>
				<button
					onClick={() => {
						list.$.push("Third");
					}}
				>
					Add
				</button>
				<button
					onClick={() => {
						list.$ = ["3", "4"];
					}}
				>
					Change
				</button>
				<button
					onClick={() => {
						list.$.pop();
					}}
				>
					Remove (last)
				</button>
				<button
					onClick={() => {
						list.$[0] = "Mamamiya";
					}}
				>
					Update (i=0)
				</button>
				<button
					onClick={() => {
						delete list.$[0];
					}}
				>
					Delete (i=0)
				</button>
			</div>
			<div
				style={{
					padding: 8,
					border: "1px solid rgba(0, 0, 0, 0.15)",
					borderRadius: 4,
				}}
			>
				{list.$.map((item, index) => {
					return (
						<div
							key={index}
							style={{
								padding: 8,
								borderTop:
									index !== 0
										? "1px solid rgba(0, 0, 0, 0.15)"
										: undefined,
							}}
						>
							{item}
						</div>
					);
				})}
			</div>
		</>
	);
};

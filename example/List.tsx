import React from "react";
import { context, observable, observe } from "../src";
import { lookAt } from "./react";

const list = observable(["First", "Second"]);

observe(() => {
	console.log("Updated0", list.$, context);
});

observe(() => {
	console.log("Updated1", list.$[0], context);
});

observe(() => {
	console.log("Updated2", list.$.join("/"), context);
});

export const List = lookAt(() => {
	console.warn("Render");

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
						list.$.pop();
					}}
				>
					Remove
				</button>
				<button
					onClick={() => {
						list.$[0] = "Mamamiya";
					}}
				>
					Update
				</button>
				<button
					onClick={() => {
						list.$ = ["3", "4"];
					}}
				>
					Change
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
});

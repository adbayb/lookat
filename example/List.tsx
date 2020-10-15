import React from "react";
import { observable, observe } from "../src";

const list = observable(["First", "Second"]);

observe(() => {
	console.log(list.$);
});

export const List = () => {
	return (
		<>
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
			<div
				style={{
					display: "flex",
					gap: 8,
					marginTop: 8,
				}}
			>
				<button
					onClick={() => {
						list.$.push("Third");
						console.warn("Add", list.$);
					}}
				>
					Add
				</button>
				<button
					onClick={() => {
						list.$.pop();
						console.warn("Remove", list.$);
					}}
				>
					Remove
				</button>
			</div>
		</>
	);
};

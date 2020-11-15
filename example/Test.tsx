import * as React from "react";
import { observable, observe } from "../src";

const map = observable(new Set<string>());

observe(() => {
	console.log("Map = ", map.$);
});

map.$.add("plop");

setTimeout(() => {
	map.$.add("ayoub");
	map.$.delete("plop");
});

export const Test = () => {
	return <div>Map Test</div>;
};

import { observable, observe } from "../src";

// @todo: plugin system via createObservable({ onSet, onGet }) <= onSet <- useState from react for example
const counter = observable(0);
const data = observable<string | null>(null);

observe(function effectData() {
	console.log("data change", data.$);
});
// observe(function effectCounter() {
// 	console.log("counter change", counter.$);
// 	if (counter.$ % 2 === 0) {
// 		data.$ = "pair";
// 	}
// 	observe(function effectCounter2() {
// 		console.log("counter change 2", counter.$);
// 	});
// });

observe(() => {
	return counter.$ % 2 === 0;
});

setInterval(() => {
	counter.$++;
	console.log(counter.$);
}, 1000);

// @section: Map vs WeakMap and memory impact (see memory panel in devtool)
// const loadMemoryButton = document.createElement("button");
// const flushMemoryButton = document.createElement("button");
// // In order to test garbage collection Map vs WeakMap correctly,
// // following line should at the top level to not be gced and keep reference to the old buffer one:
// const buffer = null;
// const map = [];

// loadMemoryButton.innerHTML = "Load memory";
// flushMemoryButton.innerHTML = "Flush memory";
// document.body.appendChild(loadMemoryButton);
// document.body.appendChild(flushMemoryButton);
// loadMemoryButton.addEventListener("click", () => {
// 	buffer = [...Array(10)].map(() => new Array(1000000).fill({}));
// 	map = buffer.map((item) => {
// 		const mapItem = new WeakMap();

// 		mapItem.set(item, true);

// 		return mapItem;
// 	});
// 	console.log("Fill", map);
// });
// flushMemoryButton.addEventListener("click", () => {
// 	buffer = null;
// 	console.log("Flushed", map[0].get());
// });

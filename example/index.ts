// @ts-nocheck
import { observable, observer } from "../src";

// @todo: plugin system via createObservable({ onSet, onGet }) <= onSet <- useState from react for example
const counter = observable(0);
const data = observable<string | null>(null);

/*
// Final API:
const [counter, setCounter] = observable(0) // if we don't use proxy (to check performance proxy vs get()/set() wrapper)
const [unsubscribe, returnValue] = observer(() => { console.log(counter) })
*/
// counter.get() // counter.set(1) / counter.set((prevCounter) => prevCounter + 1) // A la immer ?

// @todo: to simplify observer management, merge observer inside one
// (by ignoring a nested observer logic inside a parent observer)
// const unsubscribe = observer(function effect1() {
// 	console.log("data", data.value);
// 	// @note: do we really need nested observers ? To test with UI frameworks with render triggering
// 	observer(function effect2() {
// 		console.log("counter", counter.value);
// 	});
// });
observer(function effectData() {
	console.log("data", data.value);
});
observer(function effectCounter() {
	if (counter.value % 2 === 0) {
		data.value = "pair";
	}
});
setInterval(() => {
	counter.value++;
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

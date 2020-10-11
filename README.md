# lookat

An observer/observable library

## API

### Observable

const counter = observable(0); // returns counter.$ ($ is the reactive value accessor making the reactivity explicit in the naming). To mutate, use `counter.$++` for example
const person = observable({ firstname: "Ayoub", age: 28 }); // returns counter.\$.age...

### Observe

const voidValue = observe(() => console.log(counter \* 2)); // side effects
const isPair = observe(() => counter % 2 === 0); // computed reactive value => returns observable value
observe(() => {
console.log(isPair.\$)
})

### Utilities

unwrap(isPair) // returns raw value of an observable

## TODO

-   Enable more granular proxy for objects (per properties)
-   Enable Array/Map/WeakMap/Set observables (+ add tests)
-   Do not call observers if impacted value is not modified (check inside the setter trap)
-   Optimize Proxy wrapping => do not use observe api but instead observable api to define derived observables as well:
    const counter = observable(0)
    const counterSquare = observable(counter.\$ \* 2)

-   Optimize same observer calls if the side effect relies on computed observables:
    const counter = observable(0);
    const counterSquare = observe(() => counter.$2);
observe(() => {
	console.log("Counter Quatro = ", counter.$, " ", counterSquare.\$);
    });
    // => Currently, it's called two times since the observer relies on two observables but it could be improved with some predicates to be called once

-   Performance/Memory benchmark
-   Readme + Hosted documentation

## Notes

### Direct access via counter instead of counter.\$ and non reactivity inside observe callback

### API limitations and caveats with object like observable:

👉 Updates are always notified from top to bottom. Updating a child property won't notify its parent observers. But a parent update (such a new reference through object affectation) will notify its child property observers. And it's quite natural and aligned with JS runtime:
=> value and reference are managed from top to bottom: a child cannot update its parent reference.

👉 Parent update (eg. new object affectation) will notify its child observers if and only if all accessors to reach the targetted child property are specified inside the `observe` callback:

❌ const state = person.$
❌	observe(() => { state.firstName })
❌	person.$ = { firstName: "New" }
❌ // The observe callback won't be called

✔️ observe(() => { person.$.firstName })
✔️	person.$ = { firstName: "New" }
✔️ // The observe callback will be called

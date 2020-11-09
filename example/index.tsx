import React from "react";
import { render } from "react-dom";
// import { Counter as Module } from "./Counter";
// import { Person as Module } from "./Person";
import { List as Module } from "./List";
// import { Test as Module } from "./Test";

const App = () => {
	return <Module />;
};

render(<App />, document.getElementById("root"));

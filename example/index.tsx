import React from "react";
import { render } from "react-dom";
import { Counter } from "./Counter";

const App = () => {
	return <Counter />;
};

render(<App />, document.getElementById("root"));

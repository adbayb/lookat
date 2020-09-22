import React from "react";
import { render } from "react-dom";
// import { Counter } from "./Counter";
import { Person } from "./Person";

const App = () => {
	return <Person />;
};

render(<App />, document.getElementById("root"));

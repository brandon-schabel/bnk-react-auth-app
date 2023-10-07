import { useCookie } from "@u-tools/core/plugins/react/use-cookie";
import { useState } from "react";
import { CookieExample } from "../../server/types";
import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function CookieComponent() {
  const { cookie, updateCookie, removeCookie, checkCookie } =
    useCookie<CookieExample>("secret");

  console.log({ cookie });

  return (
    <div>
      <p>Current cookie value: {JSON.stringify(cookie)}</p>
      <button
        onClick={() =>
          updateCookie({
            value1: 1,
            value2: {
              value3: "test",
              value4: true,
            },
          })
        }
      >
        Set Cookie
      </button>
      <button onClick={() => removeCookie()}>Delete Cookie</button>
      {checkCookie() && <p>Cookie exists!</p>}
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState({});

  const cookieHeader = new Headers();

  cookieHeader.set("Cookie", document.cookie);

  const req = async () => {
    const res = await fetch("http://localhost:3000", {
      // include cookies on request
      // credentials: "include",
      credentials: "include",
      // headers: cookieHeader,
    });

    const data = await res.json();
    setData(data);
  };

  return (
    <>
      <div>
        <div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <button onClick={req}>Request</button>
      <CookieComponent />
    </>
  );
}

export default App;

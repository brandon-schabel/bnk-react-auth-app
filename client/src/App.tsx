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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  //
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    // make fetch request to /login route
    // with the form data

    console.log({ event });

    console.log();

    const res = await fetch("http://localhost:3000/login", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    // handle cookies
    res.headers.getSetCookie().forEach((cookie) => {
      console.log({ cookie });
      document.cookie = cookie;
    });
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

      <form>
        <label htmlFor="username">Username</label>
        <input id="username" onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleFormSubmit}>Submit</button>
      </form>
      <CookieComponent />
    </>
  );
}

export default App;

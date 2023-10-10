import { useCookie } from "@u-tools/core/plugins/react/use-cookie";
import { useState } from "react";
import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function CookieComponent() {
  const {
    cookie: cookieSecret,
    removeCookie: removeSecretCookie,
    checkCookie: checkSecretCookie,
    getCookie: getSecretCookie,
    refreshCookie: refreshSecretCookie,
  } = useCookie<string>("secret");
  const {
    cookie: carrierCookie,
    updateCookie: updateCarrier,
    removeCookie: removeCarrier,
  } = useCookie<string>("userId");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
        // it would make sense to hash the username/password and send a salt
        // but for the sake of simplicity, we'll just send the raw values
        username: username,
        password: password,
      }),
      credentials: "include",
    });

    // set the userId cookie

    // on login success, refresh the secret cookie state
    refreshSecretCookie();
  };

  return (
    <div>
      <p>Carrier cookie: {JSON.stringify(carrierCookie)}</p>
      <button onClick={removeCarrier}>Remove Carrier Cookie</button>

      {/* <button
        onClick={() =>
          updateCarrier({
            value1: 1,
            value2: {
              value3: "test",
              value4: true,
            },
          })
        }
      >
        Set Carrier Cookie
      </button> */}

      <h1>Secret Cookie</h1>
      <button onClick={() => removeSecretCookie()}>Delete Secret Cookie</button>
      {cookieSecret && <p>{getSecretCookie()}</p>}
      {checkSecretCookie() && <p>Secret Cookie exists!</p>}

      <form>
        <label htmlFor="username">Username</label>
        <input id="username" onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleFormSubmit}>Submit</button>
      </form>
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);

  const req = async () => {
    try {
      const res = await fetch("http://localhost:3000", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      setData(data);
      setError(null); // clear any previous error
    } catch (e) {
      console.error("Fetch error:", e);
      setError(e.toString());
    }
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

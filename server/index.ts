// Bun.serve({
//   fetch(req) {
//     console.log(req);
//     const origin = req.headers.get("Origin");

import {
  createSecureHashFactory,
  createServerCookieFactory,
  createServerFactory,
} from "@u-tools/core";
import { getAllCookies } from "@u-tools/core/modules/cookies/cookie-utils";
import { jsonRes } from "@u-tools/core/modules/server/request-helpers";

//     // Create headers object
//     const headers = new Headers();
//     headers.append("Access-Control-Allow-Origin", origin);
//     headers.append("Access-Control-Allow-Credentials", "true");
//     headers.append("Content-Type", "application/json");

//     // Handle OPTIONS method (CORS preflight)
//     if (req.method === "OPTIONS") {
//       headers.append("Access-Control-Allow-Methods", "GET, POST");
//       headers.append("Access-Control-Allow-Headers", "Content-Type");
//       return new Response(null, { headers });
//     }

//     return new Response("Hello World!", {
//       headers,
//     });
//   },
//   port: 3000,
// });

const clientSecurityTokenMap: Record<
  string,
  {
    salt: string;
    hash: string;
  }
> = {};

type User = {
  username: string;
  password: string;
  clientId: string;
};

type Users = {
  [username: string]: User;
};

const users: Users = {
  test: {
    username: "test",
    password: "test",
    clientId: "test",
  },
};

function createSalt(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

async function createToken(string: string, salt: string) {
  const fullPassword = string + salt;
  const hash = await Bun.password.hash(fullPassword, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
  return hash;
}

async function verifyToken(string: string, salt: string, storedHash: string) {
  const fullPassword = string + salt;
  const isMatch = await Bun.password.verify(fullPassword, storedHash);

  return isMatch;
}

const { start, route } = createServerFactory({
  //   cors: {
  //     origins: ["*"],
  //     credentials: true,
  //   },
  //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  //     headers: ["Content-Type", "Authorization", "Cookie", "Connection"],
  //   },
});

const baseReq = route("/");
const loginReq = route("/login");

try {
  baseReq(async ({ request }) => {
    try {
      //     const headers = new Headers();
      //     headers.append("Access-Control-Allow-Origin", origin);
      //     headers.append("Access-Control-Allow-Credentials", "true");
      //     headers.append("Content-Type", "application/json");

      const origin = request.headers.get("Origin");
      //     // Handle OPTIONS method (CORS preflight)
      if (request.method === "OPTIONS") {
        const headers = new Headers();

        headers.append("Access-Control-Allow-Origin", origin || "");
        request.headers.append("Access-Control-Allow-Methods", "GET, POST");
        request.headers.append("Access-Control-Allow-Headers", "Content-Type");
        return new Response(null, { headers });
      }

      const response = new Response();

      // const headers = new Headers();
      response.headers.append("Access-Control-Allow-Origin", origin || "");
      response.headers.append("Access-Control-Allow-Credentials", "true");
      response.headers.append("Content-Type", "application/json");

      const cookieSecret = createServerCookieFactory("secret", {
        request,
        response,
      });

      //   const secureToken = cookieSec.getRawCookie();
      // lets pretend user has logged in and we have a client id
      const clientId = request.headers.get("client-id") || "r#an3ld@m";

      const allCookies = getAllCookies(request);

      const hashFactory = createSecureHashFactory();

      // create a token with the client id and a salt for that client id
      // this is stored on the server

      const clientTokenLookup = clientSecurityTokenMap[clientId];

      if (!clientTokenLookup) {
        const salt = createSalt(10);
        const hash = await createToken(clientId, salt);
        clientSecurityTokenMap[clientId] = {
          salt,
          hash,
        };

        // sets cookie on the response object
        cookieSecret.setCookie(hash);
      }

      const storedHash = clientSecurityTokenMap[clientId].hash;
      const salt = clientSecurityTokenMap[clientId].salt;

      //   if (!secureToken) {
      //     return jsonRes({ message: "no secure token found" });
      //   }

      // check if the token matches the client id and salt
      const secureToken = cookieSecret.getRawCookie();

      const isMatch = await verifyToken(secureToken || "", salt, storedHash);

      // return jsonRes({
      //   message: "No Valid Token",
      // });

      return response;

      //   }
      //   return jsonRes({ message: "Hello World!" });
    } catch (e) {
      console.log(e);
    }

    return jsonRes({ message: "invalid" });
  });
} catch (e) {
  console.log({ e });
}

loginReq(async ({ request }) => {
  if (request.method === "OPTIONS") {
    const headers = new Headers();
    const origin = request.headers.get("Origin");
    headers.append("Access-Control-Allow-Origin", origin as string);
    headers.append("Access-Control-Allow-Methods", "GET, POST");
    headers.append("Access-Control-Allow-Headers", "Content-Type");
    return new Response(null, { headers });
  }

  //  parse form data
  console.log(request);
  // get json from request body
  const data = await request.text();

  console.log(JSON.parse(data));

  // const formData = await JSON.parse(request.body)

  const username = "test";
  const password = "test";

  // this is just to simulate a database lookup
  const user = users[username as string];

  if (!user) {
    return jsonRes({ message: "invalid username" });
  }

  const isPassCorrect = user.password === (password as string);

  if (!isPassCorrect) {
    return jsonRes({ message: "invalid password" });
  }

  // get client id from db
  const clientId = user.clientId;

  // create a token with the client id and a salt for that client id
  // this is stored on the server

  const salt = createSalt(10);
  const hash = await createToken(clientId, salt);

  clientSecurityTokenMap[clientId] = {
    salt,
    hash,
  };

  // sets cookie on the response object
  const response = new Response();

  const cookieSecret = createServerCookieFactory("secret", {
    request,
    response,
  });

  response.headers.append("client-id", clientId);
  const origin = request.headers.get("Origin");
  response.headers.append("Access-Control-Allow-Origin", origin);
  response.headers.append("Access-Control-Allow-Credentials", "true");
  response.headers.append("Content-Type", "application/json");
  cookieSecret.setCookie(hash);

  console.log({
    username,
    password,
    clientId,
    salt,
    hash,
  });

  return response;
});

start({ port: 3000 });

import * as u from "@u-tools/core";

import { Routes, routeManager } from "@u-tools/core/modules/server";
import { Database } from "bun:sqlite";
import { getUserByToken, loginUser } from "./auth";

const db = new Database("data.db");

// create table if no exist
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY UNIQUE,
        username TEXT UNIQUE,fvcg bvIQUE,
        salt TEXT UNIQUE,
        security_token TEXT UNIQUE,
        security_token_id TEXT UNIQUE,
        security_token_expire_dt_epoch INTEGER
    )
`
).run();

const middlewareConfig = {
  cors: (request) =>
    u.server.corsMiddleware(request, {
      methods: ["DELETE", "GET", "POST", "PUT", "OPTIONS", "PATCH"],
      origins: ["http://localhost:5173"],
      headers: [
        "Content-Type",
        "client-id",
        "Cookie-Set",
        "Cookie-Get",
        "Cookie-Delete",
        "Cookie-Delete-All",
      ],
    }),
} satisfies u.server.MiddlewareConfigMap;

const middlware = u.server.middlewareManagerFactory(middlewareConfig);

const headersToObj = (headers: Headers) => {
  const obj: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    obj[key] = value;
  }

  return obj;
};

const routes = {
  "/": {
    GET: (request, { cors }) => {
      try {
        if (cors.response.status !== 200) {
          return cors.response;
        }
        // console.log({ response });

        const response = new Response("hello world");

        const cookieSecretFactory = u.cookies.createServerCookieFactory(
          "secret",
          {
            request,
            response,
          }
        );

        const clientId = request.headers.get("client-id") || "r#an3ld@m";

        const allCookies = u.cookies.getAllCookies(request);

        const secretToken = cookieSecretFactory.getCookie(true);

        console.log({
          secretToken,
          cookieSecret: cookieSecretFactory,
          clientId,
          allCookies,
        });

        const user = getUserByToken(db, secretToken || "");

        return new Response(JSON.stringify({ user }), {
          headers: response.headers,
        });
      } catch (e) {
        const errorResponse = new Response("unknown error", { status: 500 });
        const reqOrigin = request.headers.get("origin");
        // setResponseheaders(errorResponse, reqOrigin || "");
        console.log(e);
        return errorResponse;
      }
    },
  },
  "/login": {
    POST: async (request, { cors }) => {
      console.log({ message: "at login" });
      const corsResponse = cors.response;
      const reqOrigin = request.headers.get("origin");

      //  parse form data
      // get json from request body
      const data = await request.text();

      const parsedData = JSON.parse(data);

      const username = parsedData.username;
      const password = parsedData.password;

      console.log({ headers: headersToObj(request.headers) });
      // console.log({ reqOrigin, response, username, password });
      // get all headers from response
      // const responseHeaders = response.headers;

      const user = await loginUser(db, { username, password });

      if (!user) {
        return u.server.jsonRes({ message: "invalid username" });
      }

      const userId = user.id;

      // sets cookie on the response object

      const cookieSecret = u.cookies.createServerCookieFactory("secret", {
        request,
        response: corsResponse,
      });

      corsResponse.headers.append("client-id", userId);

      // for client to be able to send cookies, we need to set the origin, it cannot be *
      // setResponseheaders(response, reqOrigin || "");

      cookieSecret.setCookie(user.security_token);

      console.log(corsResponse.headers);

      return corsResponse;
    },
  },
} satisfies Routes<ReturnType<(typeof middlware)["inferTypes"]>>;

const { start } = u.server.serverFactory({
  middlewareControl: middlware,
  router: routeManager(routes),
  optionsHandler: (request, { cors }) => {
    console.log({
      message: "handling option!",
      optionsHandler: request,
      cors,
    });

    // allow credentials
    cors.response.headers.set("Access-Control-Allow-Credentials", "true");

    // cors.response.headers
    return cors?.response;
  },
});

start(3000);

// const { start, route } = u.server.serverFactory({
//   cors: {
//     credentials: true,
//     methods: ["GET", "POST", "OPTIONS"],
//     headers: [
//       "Content-Type",
//       "client-id",
//       "Cookie-Set",
//       "Cookie-Get",
//       "Cookie-Delete",
//       "Cookie-Delete-All",
//     ],
//     origins: ["http://localhost:5173"],
//   },
// });

// const baseReq = route("/");
// const loginReq = route("/login");

// baseReq(({ request, modResponse: response }) => {
//   try {
//     console.log({ response });

//     const cookieSecretFactory = u.cookies.createServerCookieFactory("secret", {
//       request,
//       response,
//     });

//     const clientId = request.headers.get("client-id") || "r#an3ld@m";

//     const allCookies = u.cookies.getAllCookies(request);

//     const secretToken = cookieSecretFactory.getCookie(true);

//     console.log({
//       secretToken,
//       cookieSecret: cookieSecretFactory,
//       clientId,
//       allCookies,
//     });

//     const user = getUserByToken(db, secretToken || "");

//     return new Response(JSON.stringify({ user }), {
//       headers: response.headers,
//     });
//   } catch (e) {
//     const errorResponse = new Response("unknown error", { status: 500 });
//     const reqOrigin = request.headers.get("origin");
//     // setResponseheaders(errorResponse, reqOrigin || "");
//     console.log(e);
//     return errorResponse;
//   }
// });

// loginReq(async ({ request, response, modResponse }) => {
//   const reqOrigin = request.headers.get("origin");
//   if (modResponse) {
//     console.log({ modResponse });
//   }

//   //  parse form data
//   // get json from request body
//   const data = await request.text();

//   const parsedData = JSON.parse(data);

//   const username = parsedData.username;
//   const password = parsedData.password;

//   console.log({ headers: headersToObj(request.headers) });
//   console.log({ reqOrigin, response, username, password });
//   // get all headers from response
//   // const responseHeaders = response.headers;

//   const user = await loginUser(db, { username, password });

//   if (!user) {
//     return u.server.jsonRes({ message: "invalid username" });
//   }

//   const userId = user.id;

//   // sets cookie on the response object

//   const cookieSecret = u.cookies.createServerCookieFactory("secret", {
//     request,
//     response,
//   });

//   response.headers.append("client-id", userId);

//   // for client to be able to send cookies, we need to set the origin, it cannot be *
//   // setResponseheaders(response, reqOrigin || "");

//   cookieSecret.setCookie(user.security_token);

//   console.log(response.headers);

//   return response;
// });

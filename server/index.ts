// Bun.serve({
//   fetch(req) {
//     console.log(req);
//     const origin = req.headers.get("Origin");

import { createServerCookieFactory, createServerFactory } from "@u-tools/core";
import { getAllCookies } from "@u-tools/core/modules/cookies/cookie-utils";
import { jsonRes } from "@u-tools/core/modules/server/request-helpers";
import { CookieExample } from "./types";

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

const { start, route } = createServerFactory({
//   cors: {
//     origins: ["*"],
//     credentials: true,
//   },
  //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  //     headers: ["Content-Type", "Authorization", "Cookie", "Connection"],
  //   },
});

const baseReq = route("/", {});

try {
  baseReq(async ({ request }) => {
    try {
      const cookieSec = createServerCookieFactory<CookieExample>("secret", {
        request,
      });

      const cookieData = cookieSec.getCookie();
      const allCookies = getAllCookies(request);

      console.log({
        cookieData,
        cookieSec,
        allCookies,
      });

      const origin = request.headers.get("Origin");

      // Create headers object
      // TODO, need to get Request passed from middleware with these headers attached
      const headers = new Headers();
      headers.append("Access-Control-Allow-Origin", origin || "");
      headers.append("Access-Control-Allow-Credentials", "true");
      headers.append("Content-Type", "application/json");

      if (request.method === "OPTIONS") {
        headers.append("Access-Control-Allow-Methods", "GET, POST");
        headers.append("Access-Control-Allow-Headers", "Content-Type");
        return new Response(null, { headers });
      }

      console.log({
        here: "here",
      });

      //   if (cookieData) {
      return new Response(
        JSON.stringify({
          message: "Hello World!",
          cookieDataOnServer: cookieData,
        }),
        {
          headers,
        }
      );
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

start({ port: 3000 });

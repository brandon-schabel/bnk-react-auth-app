import { createServerCookieFactory } from "@u-tools/core";
import { getAllCookies } from "@u-tools/core/modules/cookies/cookie-utils";
import { createServerFactory } from "@u-tools/core/modules/server";
import { jsonRes } from "@u-tools/core/modules/server/request-helpers";
import { uuidv7 } from "@u-tools/core/modules/uuid";
import { getUuidV7Date } from "@u-tools/core/modules/uuid/generate-uuid";
import { Database } from "bun:sqlite";

const clientSecurityTokenMap: Record<
  string,
  {
    salt: string;
    hash: string;
  }
> = {};

type User = {
  security_token: string;
  security_token_id: string;
  security_token_expire_dt_epoch: number;
  username: string;
  password_hash: string;
  id: string;
  salt: string;
};

// create a sqlite database if it doesn't exist

const db = new Database("data.db");

// create table if no exist
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT UNIQUE,
        salt TEXT UNIQUE,
        security_token TEXT UNIQUE,
        security_token_id TEXT UNIQUE,
        security_token_expire_dt_epoch INTEGER
    )
`
).run();

const tokenValidTime = 1000 * 60 * 60 * 24 * 7; // 7 days

const calculateTokenV7ExpireEpoch = (
  uuid: string,
  tokenValidTimeSec: number
) => {
  const timestamp = getUuidV7Date(uuid);

  const expireEpoch = timestamp.getTime() + tokenValidTimeSec;

  return expireEpoch;
};

export const getTokenExpireEpoch = (date: Date, tokenValidTimeSec: number) => {
  const expireEpoch = date.getTime() + tokenValidTimeSec;

  return expireEpoch;
};

async function createUser({
  username,
  salt,
  password_hash: password,
  security_token,
  security_token_id,
  security_token_expire_dt_epoch,
}: User) {
  try {
    const { uuid: userId } = uuidv7();
    const params = {
      $id: userId,
      $username: username,
      $password_hash: password,
      $salt: salt,
      $security_token: security_token,
      $security_token_id: security_token_id,
      $security_token_expire_dt_epoch: security_token_expire_dt_epoch,
    };

    db.query(
      `
      INSERT INTO users (id, username, password_hash, salt, security_token, security_token_id, security_token_expire_dt_epoch)
      VALUES ($id, $username, $password_hash, $salt, $security_token, $security_token_id, $security_token_expire_dt_epoch)
    `
    ).run(params);

    console.log("User inserted:", userId);
    return getUser(username);
  } catch (e) {
    console.error({ e, note: "user creation error" });
    return null;
  }
}

async function authenticateUser(username: string, password: string) {
  const existingUser = getUser(username);
  if (!existingUser) {
    console.log("User does not exist:", username);
    return null;
  }

  const isMatch = await verifyToken(
    password,
    existingUser.salt,
    existingUser.password_hash
  );
  if (!isMatch) {
    console.log("Password is incorrect for user:", existingUser.username);
    return null;
  }

  console.log("Login successful:", existingUser.username);
  return existingUser;
}

const loginUser = async (
  userInput: {
    username: string;
    password: string;
  },
  tokenValidTime = 1000 * 60 * 60 * 24 * 7
): Promise<User | null> => {
  const { username, password } = userInput;
  const { uuid: salt } = uuidv7();
  const { uuid: tokenId, timestamp } = uuidv7();

  const passwordHash = await createToken(password, salt);
  const securityToken = await createToken(tokenId, salt);
  const tokenExpireEpoch = getTokenExpireEpoch(timestamp, tokenValidTime);

  // Try authenticating the user
  const authenticatedUser = await authenticateUser(username, password);
  if (authenticatedUser) return authenticatedUser;

  // If authentication failed, create a new user and return it
  return createUser({
    id: uuidv7().uuid,
    username,
    password_hash: passwordHash,
    salt,
    security_token: securityToken,
    security_token_id: tokenId,
    security_token_expire_dt_epoch: tokenExpireEpoch,
  });
};

const getUser = (username: string): User | null => {
  return (
    (db
      .query(
        `
    SELECT * FROM users WHERE username = $username
`
      )
      .get({
        $username: username,
      }) as User) || null
  );
};

const doesUserExist = (username: string) => {
  const user = getUser(username);

  return !!user;
};

export const createSecureToken = async (clientId: string) => {
  const { uuid: salt } = uuidv7();
  const hash = await createToken(clientId, salt);

  return {
    salt,
    hash,
  };
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

async function verifyToken(
  tokenString: string,
  salt: string,
  storedHash: string
) {
  console.log({
    tokenString,
    salt,
    storedHash,
    fn: "verifyToken",
  });
  const fullPassword = tokenString + salt;
  const isMatch = await Bun.password.verify(fullPassword, storedHash);

  return isMatch;
}

const { start, route } = createServerFactory({});

const baseReq = route("/");
const loginReq = route("/login");

try {
  baseReq(async ({ request }) => {
    try {
      const origin = request.headers.get("Origin");

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

      console.log({ allCookies, clientId });

      // const clientTokenLookup = clientSecurityTokenMap[clientId];
      const secretToken = cookieSecret.getCookie(true);

      console.log({ secretToken });

      const user = getUser(clientId || "");
      console.log({ user });

      return jsonRes(
        {
          message: user ? "Valid Match" : "No Valid Token",
          user,
        },
        {},
        response
      );
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
    headers.append("Access-Control-Allow-Origin", origin || "");
    headers.append("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.append("Access-Control-Allow-Headers", "Content-Type");
    headers.append("Access-Control-Allow-Credentials", "true");
    return new Response(null, { headers });
  }

  //  parse form data
  // get json from request body
  const data = await request.text();

  const parsedData = JSON.parse(data);

  const username = parsedData.username;
  const password = parsedData.password;

  console.log({ username, password });

  const user = await loginUser({ username, password });
  if (!user) {
    return jsonRes({ message: "invalid username" });
  }

  const userId = user.id;

  // sets cookie on the response object
  const response = new Response();

  const cookieSecret = createServerCookieFactory("secret", {
    request,
    response,
  });

  console.log({
    user,
  });

  console.log({ cookieSecret });

  response.headers.append("client-id", userId);
  const origin = request.headers.get("Origin") || "";
  response.headers.append("Access-Control-Allow-Origin", origin);
  response.headers.append("Access-Control-Allow-Credentials", "true");
  response.headers.append("Content-Type", "application/json");

  cookieSecret.setCookie(user.security_token);

  console.log(response.headers);

  return response;
});

start({ port: 3000, verbose: true });

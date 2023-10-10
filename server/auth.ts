import { uuidv7 } from "@u-tools/core/modules/uuid";
import Database from "bun:sqlite";
import { getUuidV7Date } from "@u-tools/core/modules/uuid/generate-uuid";

const tokenValidTime = 1000 * 60 * 60 * 24 * 7; // 7 days

const calculateTokenV7ExpireEpoch = (
  uuid: string,
  tokenValidTimeSec: number
) => {
  const timestamp = getUuidV7Date(uuid);

  const expireEpoch = timestamp.getTime() + tokenValidTimeSec;

  return expireEpoch;
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

export type User = {
  security_token: string;
  security_token_id: string;
  security_token_expire_dt_epoch: number;
  username: string;
  password_hash: string;
  id: string;
  salt: string;
};

export const getTokenExpireEpoch = (date: Date, tokenValidTimeSec: number) => {
  const expireEpoch = date.getTime() + tokenValidTimeSec;

  return expireEpoch;
};

export async function createUser(
  db: Database,
  {
    username,
    salt,
    password_hash: password,
    security_token,
    security_token_id,
    security_token_expire_dt_epoch,
  }: User
) {
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

    console.info("User inserted:", userId);
    return getUser(db, username);
  } catch (e) {
    console.error({ e, note: "user creation error" });
    return null;
  }
}

export async function authenticateUser(
  db: Database,
  username: string,
  password: string
) {
  const existingUser = getUser(db, username);
  if (!existingUser) {
    console.info("User does not exist:", username);
    return null;
  }

  const isMatch = await verifyToken(
    password,
    existingUser.salt,
    existingUser.password_hash
  );
  if (!isMatch) {
    console.info("Password is incorrect for user:", existingUser.username);
    return null;
  }

  console.info("Login successful:", existingUser.username);
  return existingUser;
}

export const loginUser = async (
  db: Database,
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
  const authenticatedUser = await authenticateUser(db, username, password);
  if (authenticatedUser) return authenticatedUser;

  // If authentication failed, create a new user and return it
  return createUser(db, {
    id: uuidv7().uuid,
    username,
    password_hash: passwordHash,
    salt,
    security_token: securityToken,
    security_token_id: tokenId,
    security_token_expire_dt_epoch: tokenExpireEpoch,
  });
};

export const getUser = (db: Database, username: string): User | null => {
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

export const createSecureToken = async (clientId: string) => {
  const { uuid: salt } = uuidv7();
  const hash = await createToken(clientId, salt);

  return {
    salt,
    hash,
  };
};

export async function createToken(string: string, salt: string) {
  const fullPassword = string + salt;
  const hash = await Bun.password.hash(fullPassword, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
  return hash;
}

export async function verifyToken(
  tokenString: string,
  salt: string,
  storedHash: string
) {
  const fullPassword = tokenString + salt;
  const isMatch = await Bun.password.verify(fullPassword, storedHash);

  return isMatch;
}
# Replicache Summary

Replicache is a sync engine for web apps that enables real-time collaboration, offline support, and instant UI updates.

## Core Concepts

- **Client View**: A key-value store on the client that syncs with the server
- **Mutators**: Functions that modify data, executed both on client (optimistically) and server (authoritatively)
- **Subscriptions**: React to data changes and update UI

## Client Setup

```javascript
const rep = new Replicache({
  name: 'user-id',  // Unique per user
  licenseKey: '...', // Required - get with 'npx replicache@latest get-license'
  pullURL: '/api/replicache/pull',
  pushURL: '/api/replicache/push',
  mutators: {
    async createThing(tx, data) {
      await tx.set(`thing/${data.id}`, data);
    },
    // Add more mutators...
  }
});
```

## Client Usage

```javascript
// Modify data using mutators
await rep.mutate.createThing({id: 'abc123', value: 'Hello'});

// Read data with subscriptions
const things = useSubscribe(
  rep,
  async tx => {
    return await tx.scan({prefix: 'thing/'}).toArray();
  },
  {onData: (result) => {
    // Update UI with result
  }}
);
```

## Server Implementation

The server needs to implement two endpoints:

### Push Endpoint
- Receives client mutations
- Applies them to server database
- Updates `lastMutationID` for the client

### Pull Endpoint
- Returns patch of changes since last pull
- Includes `lastMutationIDChanges` to confirm processed mutations
- Uses a `cookie` value to track state

### Database Schema
Minimally requires:
1. Main data tables (your app entities)
2. `replicache_client` table: tracks `lastMutationID` per client
3. Version tracking (depends on strategy chosen)

## Sync Strategies

1. **Global Version**: Simple, single version number for entire database
2. **Per-Space Version**: Same but with multiple "spaces" (e.g., per-organization)
3. **Row Version**: Most flexible, tracks versions per-row

## Poke Mechanism

For real-time updates, implement "pokes" to notify clients when data changes:
1. After server processes a mutation, send poke to connected clients
2. When clients receive a poke, they pull


## Global Version Strategy

### Database Schema
```sql
-- Global version for the entire database
CREATE TABLE replicache_server (
  id INTEGER PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL
);
INSERT INTO replicache_server (id, version) VALUES (1, 1);

-- Track clients and their last processed mutation
CREATE TABLE replicache_client (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  client_group_id VARCHAR(36) NOT NULL,
  last_mutation_id INTEGER NOT NULL,
  version INTEGER NOT NULL
);

-- Your app data with version tracking
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  sender VARCHAR(255) NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL
);
```

### Push Endpoint Implementation
```javascript
async function handlePush(req, res) {
  const push = req.body;
  
  try {
    // Process each mutation in a transaction
    for (const mutation of push.mutations) {
      await db.transaction(async (tx) => {
        // Get current version
        const {version: prevVersion} = await tx.one(
          'SELECT version FROM replicache_server WHERE id = 1 FOR UPDATE'
        );
        const nextVersion = prevVersion + 1;
        
        // Get last mutation ID for this client
        const client = await tx.oneOrNone(
          'SELECT last_mutation_id FROM replicache_client WHERE id = $1',
          mutation.clientID
        );
        const lastMutationID = client?.last_mutation_id || 0;
        const nextMutationID = lastMutationID + 1;
        
        // Skip if already processed
        if (mutation.id < nextMutationID) {
          return;
        }
        
        // Ensure no mutations are missing
        if (mutation.id > nextMutationID) {
          throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
        }
        
        // Process the mutation based on name
        switch (mutation.name) {
          case 'createMessage':
            await tx.none(
              `INSERT INTO messages (id, content, sender, deleted, version)
               VALUES ($1, $2, $3, false, $4)`,
              [mutation.args.id, mutation.args.content, mutation.args.sender, nextVersion]
            );
            break;
          // Handle other mutator types...
          default:
            throw new Error(`Unknown mutation: ${mutation.name}`);
        }
        
        // Update client's last mutation ID
        if (client) {
          await tx.none(
            `UPDATE replicache_client 
             SET last_mutation_id = $1, version = $2
             WHERE id = $3`,
            [nextMutationID, nextVersion, mutation.clientID]
          );
        } else {
          await tx.none(
            `INSERT INTO replicache_client (id, client_group_id, last_mutation_id, version)
             VALUES ($1, $2, $3, $4)`,
            [mutation.clientID, push.clientGroupID, nextMutationID, nextVersion]
          );
        }
        
        // Update global version
        await tx.none(
          'UPDATE replicache_server SET version = $1 WHERE id = 1',
          [nextVersion]
        );
      });
    }
    
    // Send a 'poke' to connected clients to pull
    await sendPoke();
    
    res.json({});
  } catch (e) {
    console.error(e);
    res.status(500).json({error: e.message});
  }
}
```

### Pull Endpoint Implementation
```javascript
async function handlePull(req, res) {
  const pull = req.body;
  const fromVersion = pull.cookie ?? 0;
  
  try {
    await db.transaction(async (tx) => {
      // Get current version
      const {version: currentVersion} = await tx.one(
        'SELECT version FROM replicache_server WHERE id = 1'
      );
      
      // Get lastMutationID changes for this client group
      const clientRows = await tx.manyOrNone(
        `SELECT id, last_mutation_id
         FROM replicache_client
         WHERE client_group_id = $1 AND version > $2`,
        [pull.clientGroupID, fromVersion]
      );
      
      const lastMutationIDChanges = {};
      for (const row of clientRows) {
        lastMutationIDChanges[row.id] = row.last_mutation_id;
      }
      
      // Get changed data since last pull
      const changed = await tx.manyOrNone(
        'SELECT id, content, sender, deleted, version FROM messages WHERE version > $1',
        [fromVersion]
      );
      
      // Build patch
      const patch = [];
      for (const row of changed) {
        if (row.deleted) {
          patch.push({
            op: 'del',
            key: `message/${row.id}`
          });
        } else {
          patch.push({
            op: 'put',
            key: `message/${row.id}`,
            value: {
              content: row.content,
              sender: row.sender
            }
          });
        }
      }
      
      // Return response
      res.json({
        lastMutationIDChanges,
        cookie: currentVersion,
        patch
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({error: e.message});
  }
}
```

The Global Version strategy is the simplest to implement and works well for applications with low to moderate concurrency requirements where all data is synced to all users.

## Row version strategy

The Row Version Strategy
This strategy has a few big advantages over the other strategies:

The Client View can be computed dynamically — it can be any arbitrary query over the database, including filters, joins, windows, auth, etc. This pull query can even change per-user. If the user checks a box in the UI, the query might change from “all active threads" to "all active threads, or first 20 inactive threads ordered by modified-date”.
It does not require global locks or the concept of spaces.
It does not require a soft deletes. Entities can be fully deleted.
The disadvantage is that it pays for this flexibility in increased implementation complexity and read cost. Pulls become more expensive because they require a few queries, and they aren’t a simple index scan. However because there are no global locks, the database should be easier to scale.

Client View Records
A Client View Record (CVR) is a minimal representation of a Client View snapshot. In other words, it captures what data a Client Group had at a particular moment in time.

In TypeScript, it might look like:

type CVR = {
  id: string;
  // Map of clientID->lastMutationID pairs, one for each client in the
  // client group.
  lastMutationIDs: Record<string, number>;
  // Map of key->version pairs, one for each entity in the client view.
  entities: Record<string, number>;
};

One CVR is generated for each pull response and stored in some ephemeral storage. The storage doesn’t need to be durable — if the CVR is lost, the server can just send a reset patch. And the storage doesn’t need to be transactional with the database. Redis is fine.

The CVRs are stored keyed under a random unique ID which becomes the cookie sent to Replicache.

During pull, the server uses the cookie to lookup the CVR associated with the previous pull response. It then computes a new CVR for the latest server state and diffs the two CVRs to compute the delta to send to the client.

Schema
type ReplicacheClientGroup = {
  // Same as the Reset Strategy.
  id: string;
  userID: any;

  // Replicache requires that cookies are ordered within a client group.
  // To establish this order we simply keep a counter.
  cvrVersion: number;
};

type ReplicacheClient = {
  // Same as the Reset Strategy.
  id: string;
  clientGroupID: string;
  lastMutationID: number;
};

// Each of your domain entities will have one extra field.
type Todo = {
  // ... fields needed for your application (id, title, complete, etc)

  // Incremented each time this row is updated.
  // In Postgres, there is no need to declare this as Postgres tracks its
  // own per-row version 'xmin' which we can use for this purpose:
  // https://www.postgresql.org/docs/current/ddl-system-columns.html
  version: number;
};

Push
The push handler is similar to the Reset Strategy, except for with some modifications to track changes to clients and domain entities. The changes from the Reset Strategy are marked in bold.

Replicache sends a PushRequest to the push endpoint. For each mutation described in the request body, the push endpoint should:

let errorMode = false
Begin transaction
getClientGroup(body.clientGroupID), or default to:
{
  id: body.clientGroupID,
  userID
  cvrVersion: 0,
}

Verify requesting user owns specified client group.
getClient(mutation.clientID) or default to:
{
  id: mutation.clientID,
  clientGroupID: body.clientGroupID,
  lastMutationID: 0,
}

Verify requesting client group owns requested client
let nextMutationID = client.lastMutationID + 1
Rollback transaction and skip mutation if already processed (mutation.id < nextMutationID)
Rollback transaction and error if mutation from future (mutation.id > nextMutationID)
If errorMode != true then:
Try business logic for mutation
Increment version for modified rows
Note: Soft-deletes not required – you can delete rows normally as part of mutations
If error:
Log error
Abort transaction
Retry this transaction with errorMode = true
putClientGroup():
{
  id: body.clientGroupID,
  userID,
  cvrVersion: clientGroup.cvrVersion,
}

putClient():
{
  id: mutation.clientID,
  clientGroupID: body.clientGroupID,
  lastMutationID: nextMutationID,
}

Commit transaction
After the loop is complete, poke clients to cause them to pull.

Pull
The pull logic is more involved than other strategies because of the need to manage the CVRs.

Replicache sends a PullRequest to the pull endpoint. The endpoint should:

let prevCVR = getCVR(body.cookie.cvrID)
let baseCVR = prevCVR or default to:
{
  "id": "",
  "entries": {}
}

Begin transaction
getClientGroup(body.clientGroupID), or default to:
{
  id: body.clientGroupID,
  userID,
  cvrVersion: 0,
}

Verify requesting client group owns requested client.
Read all id/version pairs from the database that should be in the client view. This query can be any arbitrary function of the DB, including read authorization, paging, etc.
Read all clients in the client group.
Build nextCVR from entities and clients.
Calculate the difference between baseCVR and nextCVR
If prevCVR was found and two CVRs are identical then exit this transaction and return a no-op PullResopnse to client:
{
  cookie: prevCookie,
  lastMutationIDChanges: {},
  patch: [],
}

Fetch all entities from database that are new or changed between baseCVR and nextCVR
let clientChanges = clients that are new or changed since baseCVR
let nextCVRVersion = Math.max(pull.cookie?.order ?? 0, clientGroup.cvrVersion) + 1
caution
It's important to default to the incoming cookie's order because when Replicache creates a new ClientGroup, it can fork from an existing one, and we need the order to not go backward.

putClientGroup():
{
  id: clientGroup.id,
  userID: clientGroup.userID,
  cvrVersion: nextCVRVersion,
}

Commit
let nextCVRID = randomID()
putCVR(nextCVR)
Create a PullResponse with:
A patch with:
op:clear if prevCVR === undefined
op:put for every created or changed entity
op:del for every deleted entity
{order: nextCVRVersion, cvrID} as the cookie.
lastMutationIDChanges with entries for every client that has changed.
Example
See todo-row-versioning for a complete example of this strategy, including sharing and dynamic authorization.

Queries and Windowing
The query that builds the client view can change at any time, and can even be per-user. However, slight care must be taken because of the way that Replicache data is shared between tabs. Changing the pull query in one tab changes it for other tabs that are sharing the same Replicache. Without coordination, this could result in two tabs “fighting” over the current query.

The solution is to sync the current query with Replicache (🤯). That way it will be automatically synced to all tabs.

Add a new entity to the backend database to store the current query for a profile. Like other entities it should have a version field. Let’s say: /control/<userid>/query.
When computing the pull, first read this value. If not present, use the default query. Include this entity in the pull response as any other entity.
In the UI can use the query data in the client view to check and uncheck filter boxes, etc., just like other Replicache data!
Add mutations that modify this entity.
Variations
The CVR can be passed into the database as an argument enabling the pull to be computed in a single DB round-trip.
The CVR can be stored in the primary database, allowing the patch to be computed with database joins and dramatically reducing amount of data read from DB.
The per-row version number can also be a hash over the row serialization, or even a random GUID. These approaches might perform better in some datastores since it eliminates a read of the existing row during write.


## Pull Endpoint Reference

The Pull Endpoint serves the Client View for a particular Replicache client.

For more information, see How Replicache Works — Pull.

Configuration
Specify the URL with the pullURL constructor option:

const rep = new Replicache({
  // ...
  pullURL: '/replicache-pull',
});

Method
Replicache always fetches the pull endpoint using HTTP POST:

POST /replicache-pull HTTP/2

Request Headers
Replicache sends the following HTTP request headers with pull requests:

Content-type: application/json
Authorization: <auth>
X-Replicache-RequestID: <request-id>

Content-type
Always application/json.

Authorization
This is a string that should be used to authorize a user. It is prudent to also verify that the clientID passed in the PushRequest in fact belongs to that user. If not, and users' clientIDs are somehow visible, a user could pull another user's Client View.

The auth token is set by defining auth.

X-Replicache-RequestID
The request ID is useful for debugging. It is of the form <clientid>-<sessionid>-<request count>. The request count enables one to find the request following or preceeding a given request. The sessionid scopes the request count, ensuring the request id is probabilistically unique across restarts (which is good enough).

This header is useful when looking at logs to get a sense of how a client got to its current state.

HTTP Request Body
When pulling we POST an HTTP request with a JSON encoded body.

type PullRequest = {
  pullVersion: 1;
  clientGroupID: string;
  cookie: JSONValue;
  profileID: string;
  schemaVersion: string;
};

pullVersion
Version of the type Replicache uses for the response JSON. The current version is 1.

clientGroupID
The clientGroupID of the requesting Replicache client group.

cookie
The cookie that was received last time a pull was done. null if this is the first pull from this client.

profileID
The profileID of the requesting Replicache instance. All clients within a browser profile share the same profileID. It can be used for windowing the Client View, which one typically wants to do per-browser-profile, not per-client.

schemaVersion
This is something that you control and should identify the schema of your client view. This ensures that you are sending data of the correct type so that the client can correctly handle the data.

The schemaVersion can be set in the ReplicacheOptions when creating your instance of Replicache.

HTTP Response
HTTP Response Status
200 for success
401 for auth error — Replicache will reauthenticate using getAuth if available
All other status codes considered errors
Replicache will exponentially back off sending pushes in the case of both network level and HTTP level errors.

HTTP Response Body
The response body is a JSON object of the PullResponse type:

export type PullResponse =
  | PullResponseOK
  | ClientStateNotFoundResponse
  | VersionNotSupportedResponse;

export type PullResponseOK = {
  cookie: Cookie;
  lastMutationIDChanges: Record<ClientID, number>;
  patch: PatchOperation[];
};

export type Cookie =
  | null
  | string
  | number
  | (ReadonlyJSONValue & {readonly order: number | string});

/**
 * In certain scenarios the server can signal that it does not know about the
 * client. For example, the server might have lost all of its state (this might
 * happen during the development of the server).
 */
export type ClientStateNotFoundResponse = {
  error: 'ClientStateNotFound';
};

/**
 * The server endpoint may respond with a `VersionNotSupported` error if it does
 * not know how to handle the {@link pullVersion}, {@link pushVersion} or the
 * {@link schemaVersion}.
 */
export type VersionNotSupportedResponse = {
  error: 'VersionNotSupported';
  versionType?: 'pull' | 'push' | 'schema' | undefined;
};

cookie
The cookie is an opaque-to-the-client value set by the server that is returned by the client in the next PullRequest. The server uses it to create the patch that will bring the client's Client View up to date with the server's.

The cookie must be orderable (string or number) or an object with a special order field with the same constraints.

For more information on how to use the cookie see Computing Changes for Pull.

lastMutationIDChanges
A map of clients whose lastMutationID have changed since the last pull.

patch
The patch the client should apply to bring its state up to date with the server.

Basically this should be the delta between the last pull (as identified by the request cookie) and now.

The patch supports 3 operations:

type PatchOperation =
  | {
      op: 'put';
      key: string;
      value: JSONValue;
    }
  | {op: 'del'; key: string}
  | {op: 'clear'};

put
Puts a key value into the data store. The key is a string and the value is any JSONValue.

del
Removes a key from the data store. The key is a string.

clear
Removes all the data from the client view. Basically replacing the client view with an empty map.

This is useful in case the request cookie is invalid or not known to the server, or in any other case where the server cannot compute a diff. In those cases, the server can use clear followed by a set of puts that completely rebuild the Client View from scratch.

Computing Changes for Pull
See Diff Strategies for information on different approaches to implementing pull.

Handling Unknown Clients
Replicache does not currently support deleting client records from the server.

As such there is only one valid way a requesting clientID could be unknown to the server: the client is new and the record hasn't been created yet. For these new clients, our recommendation is:

Validate the requesting client is in fact new (lastMutationID === 0). If the client isn't new, then data must have been deleted from the server which is not allowed. The server should abort and return a 500.
Compute a patch and cookie as normal, and return lastMutationID: 0. The push handler should create the client record on first push.
See Dynamic Pull for an example implementation.

Pull Launch Checklist
Check the Launch to Production HOWTO for the checklist that is common for both push and pull.
Ensure that the lastMutationID returned in the response is read in the same transaction as the client view data (ie, is consistent with it).
If there is a problem with the cookie (e.g., it is unusable) return all data. This is done by first sending a clear op followed by multiple put ops.
Make sure that the client view is not a function of the client ID. When starting up Replicache, Replicache will fork the state of an existing client (client view and cookie) and create a new client (client view, client ID and cookie).
Ignore all pull requests with an unexpected pullVersion.
Do not use the clientID to look up what information was last sent to a client when computing the PullResponse. Since a clientID represents a unique running instance of Replicache, that design would result in each new tab pulling down a fresh snapshot. Instead, use the cookie feature of PullResponse to uniquely identify the data returned by pull. Replicache internally forks the cache when creating a new client and will reuse these cookie values across clients, resulting in new clients being able to startup from previous clients' state with minimal download at startup.
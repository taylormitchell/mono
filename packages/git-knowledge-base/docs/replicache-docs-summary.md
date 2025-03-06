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


## Example server implementation: Global Version Strategy

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











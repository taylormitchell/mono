I need a summary of how the sync setup is working or something. I don't get the patterns.
- [ ] need to pull labelled relations
- [ ] settings need to be synced too. move setupSync into graphStore 
- [ ] seems like there's gotta be a better way to handle positions and updating them. see DeleteRelationSchema too
    - the positions are just a row in a table. they can be update, deleted, added to etc just like any other. they're represented in a denormalized way in the front end but we can still represent the changes as CRUD operations like any other.

- [ ] do we really need to include the map.set and map.delete calls in the rollback logic? I don't think it's _possible_ for them to throw.
- [ ] do `this.*.(delete|set)\(` search and check we're generating updates for each one
- Hard to tell which methods on graph store are for features vs internally sync use (maybe was just updateRelationList, which wasn't private)


- I don't really get these try/catch and recover blocks like GraphStore.createRelation. Like, I think it's just as likely we'll put ourselves into an invalid state in these catch blocks compared to e.g. letting all the operations go through. But also, don't all our changes return updates? can't we use those to rollback?   


principle: everything should be relatable
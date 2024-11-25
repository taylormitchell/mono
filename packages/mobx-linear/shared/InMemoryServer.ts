export type StoreEvent =
  | {
      type: "create";
      model: string;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      type: "update";
      model: string;
      id: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: "delete";
      model: string;
      id: string;
    };

export type Patch = {
  type: "set";
  model: string;
  id: string;
  props: Record<string, unknown> | null;
};

export type Mutation = {
  mutationId: number;
  events: StoreEvent[];
};

type ModelData = {
  props: Record<string, unknown>;
  deleted?: boolean;
  version: number;
};

export class InMemoryServer {
  private globalVersion = 0;
  private models: Record<string, Map<string, ModelData>> = {};
  private clients: Map<string, { lastPulledVersion: number; lastPushedMutationId: number }> =
    new Map();

  private getModelMap(model: string) {
    let modelMap = this.models[model];
    if (!modelMap) {
      modelMap = new Map();
      this.models[model] = modelMap;
    }
    return modelMap;
  }

  private getModel(model: string, id: string) {
    return this.getModelMap(model).get(id);
  }

  private setModel(model: string, id: string, data: ModelData) {
    this.getModelMap(model).set(id, data);
  }

  async handlePush(clientId: string, mutations: Mutation[]) {
    const client = this.getClient(clientId);
    // Apply each mutation in order
    for (const { mutationId, events } of mutations) {
      // Skip if we've already seen this mutation
      if (client.lastPushedMutationId >= mutationId) continue;

      // Apply each event in the mutation
      this.globalVersion++;
      for (const event of events) {
        const existing = this.getModel(event.model, event.id);
        switch (event.type) {
          case "create":
          case "update": {
            if (existing?.deleted) continue;
            const existingProps = existing?.props ?? {};
            const newProps =
              event.type === "create"
                ? { ...event.props }
                : { ...existingProps, [event.field]: event.newValue };
            this.setModel(event.model, event.id, {
              props: newProps,
              version: this.globalVersion,
            });
            break;
          }
          case "delete": {
            if (!existing || existing.deleted) continue;
            this.setModel(event.model, event.id, {
              ...existing,
              deleted: true,
              version: this.globalVersion,
            });
            break;
          }
        }
      }

      client.lastPushedMutationId = mutationId;
    }
  }

  private getClient(clientId: string) {
    let client = this.clients.get(clientId);
    if (!client) {
      client = {
        lastPulledVersion: -1,
        lastPushedMutationId: -1,
      };
      this.clients.set(clientId, client);
    }
    return client;
  }

  async handlePull(clientId: string) {
    const client = this.getClient(clientId);

    const lastPulledVersion = client.lastPulledVersion;
    const patches: Patch[] = [];

    // Look through all models for changes since last version
    for (const [modelName, modelMap] of Object.entries(this.models)) {
      for (const [id, { props: data, version, deleted }] of modelMap.entries()) {
        if (version > lastPulledVersion) {
          patches.push({
            type: "set",
            model: modelName,
            id,
            props: deleted ? null : data,
          });
        }
      }
    }

    client.lastPulledVersion = this.globalVersion;
    return {
      patches,
      lastMutationId: client.lastPushedMutationId,
    };
  }

  dump() {
    return {
      globalVersion: this.globalVersion,
      models: Object.fromEntries(
        Object.entries(this.models).map(([model, modelMap]) => [
          model,
          Array.from(modelMap.values()),
        ])
      ),
      clients: Array.from(this.clients.entries()),
    };
  }
}

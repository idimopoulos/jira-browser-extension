(function () {
  const STORAGE_KEY = "jiraQuickWorklogData";
  const DEFAULT_DATA = {
    instances: [],
    recentTickets: {}
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeBaseUrl(baseUrl) {
    if (!baseUrl) {
      return "";
    }

    try {
      const url = new URL(baseUrl.trim());
      return (url.origin + url.pathname).replace(/\/+$/, "");
    } catch (error) {
      return baseUrl.trim().replace(/\/+$/, "");
    }
  }

  function getStorageArea() {
    return chrome.storage.local;
  }

  async function getData() {
    const result = await getStorageArea().get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] || {};
    return {
      instances: Array.isArray(stored.instances) ? stored.instances : [],
      recentTickets: stored.recentTickets && typeof stored.recentTickets === "object" ? stored.recentTickets : {}
    };
  }

  async function setData(data) {
    const nextData = {
      instances: Array.isArray(data.instances) ? data.instances : [],
      recentTickets: data.recentTickets && typeof data.recentTickets === "object" ? data.recentTickets : {}
    };

    await getStorageArea().set({
      [STORAGE_KEY]: nextData
    });

    return nextData;
  }

  async function getInstances() {
    const data = await getData();
    return clone(data.instances);
  }

  async function saveInstance(instance) {
    const data = await getData();
    const instances = [...data.instances];
    const normalizedInstance = {
      id: instance.id || createId("instance"),
      name: (instance.name || "").trim(),
      baseUrl: normalizeBaseUrl(instance.baseUrl),
      installation: (instance.installation || "cloud").trim().toLowerCase(),
      login: (instance.login || "").trim(),
      authType: (instance.authType || "basic").trim().toLowerCase(),
      accessKey: (instance.accessKey || "").trim()
    };

    const index = instances.findIndex(function (item) {
      return item.id === normalizedInstance.id;
    });

    if (index >= 0) {
      instances[index] = normalizedInstance;
    } else {
      instances.push(normalizedInstance);
    }

    await setData({
      instances: instances,
      recentTickets: data.recentTickets
    });

    return normalizedInstance;
  }

  async function deleteInstance(instanceId) {
    const data = await getData();
    const instances = data.instances.filter(function (item) {
      return item.id !== instanceId;
    });
    const recentTickets = clone(data.recentTickets);
    delete recentTickets[instanceId];

    await setData({
      instances: instances,
      recentTickets: recentTickets
    });
  }

  async function getRecentTickets(instanceId) {
    const data = await getData();
    const list = data.recentTickets[instanceId];
    return Array.isArray(list) ? clone(list) : [];
  }

  async function upsertRecentTicket(instanceId, ticket) {
    if (!instanceId || !ticket || !ticket.key) {
      return null;
    }

    const data = await getData();
    const list = Array.isArray(data.recentTickets[instanceId]) ? data.recentTickets[instanceId] : [];
    const deduped = list.filter(function (item) {
      return item.key !== ticket.key;
    });

    const nextTicket = Object.assign({}, ticket, {
      timestamp: ticket.timestamp || Date.now()
    });

    data.recentTickets[instanceId] = [nextTicket].concat(deduped).slice(0, 10);
    await setData(data);
    return nextTicket;
  }

  async function findInstanceByUrl(url) {
    if (!url) {
      return null;
    }

    const instances = await getInstances();
    const normalizedUrl = url.replace(/\/+$/, "");

    return instances.find(function (instance) {
      return normalizedUrl.startsWith(instance.baseUrl);
    }) || null;
  }

  const api = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_DATA: DEFAULT_DATA,
    createId: createId,
    normalizeBaseUrl: normalizeBaseUrl,
    getData: getData,
    setData: setData,
    getInstances: getInstances,
    saveInstance: saveInstance,
    deleteInstance: deleteInstance,
    getRecentTickets: getRecentTickets,
    upsertRecentTicket: upsertRecentTicket,
    findInstanceByUrl: findInstanceByUrl
  };

  if (typeof self !== "undefined") {
    self.StorageAPI = api;
  }

  if (typeof window !== "undefined") {
    window.StorageAPI = api;
  }
})();

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request.startsWith("@/")) {
    const target = path.join(process.cwd(), request.slice(2));
    if (fs.existsSync(target + ".ts")) return target + ".ts";
    if (fs.existsSync(target + ".tsx")) return target + ".tsx";
    if (fs.existsSync(target + ".js")) return target + ".js";
    if (fs.existsSync(path.join(target, "index.ts"))) return path.join(target, "index.ts");
    if (fs.existsSync(path.join(target, "index.js"))) return path.join(target, "index.js");
    return target;
  }
  return originalResolveFilename.call(this, request, parent, isMain);
};

const prismaEnums = {
  MediaType: { FILM: "FILM", TV: "TV" },
  InteractionStatus: { WATCHED: "WATCHED", NOT_WATCHED: "NOT_WATCHED", UNSURE: "UNSURE" },
  TvInteractionStatus: { WATCHED: "WATCHED", PARTIALLY_WATCHED: "PARTIALLY_WATCHED", NOT_WATCHED: "NOT_WATCHED", UNSURE: "UNSURE" },
  RatingStatus: { LOVE: "LOVE", LIKE: "LIKE", NEUTRAL: "NEUTRAL", DISLIKE: "DISLIKE" },
  RecommendationAction: { LIKE: "LIKE", DISLIKE: "DISLIKE", HIDE: "HIDE", WATCHLIST: "WATCHLIST", WATCH_LATER: "WATCH_LATER", NOT_INTERESTED: "NOT_INTERESTED", ALREADY_WATCHED: "ALREADY_WATCHED", WATCHED_FROM_RECOMMENDATION: "WATCHED_FROM_RECOMMENDATION" },
  MovieNightStatus: { LOBBY: "LOBBY", READY: "READY", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED", EXPIRED: "EXPIRED" },
  AdminRole: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN" },
  AccountType: { ANONYMOUS: "ANONYMOUS", REGISTERED: "REGISTERED" },
  AuthProvider: { ANONYMOUS: "ANONYMOUS", GOOGLE: "GOOGLE", EMAIL: "EMAIL" },
  LibraryState: { WATCHLIST: "WATCHLIST", WATCHED: "WATCHED", DROPPED: "DROPPED" },
  IndexNowStatus: { PENDING: "PENDING", PROCESSING: "PROCESSING", SUBMITTED: "SUBMITTED", FAILED: "FAILED" },
};

// In-memory Prisma store mock for full offline unit testing
function createModelMock(name, allStores) {
  const store = new Map();
  let idCounter = 1;

  // Pre-seed mock catalog for Movie and TvShow to support offline recommendation tests
  if (name === "movie") {
    for (let i = 1; i <= 60; i++) {
      const id = `movie-${i}`;
      store.set(id, {
        id,
        tmdbId: 10000 + i,
        title: `Test Movie ${i}`,
        originalTitle: `Test Movie ${i}`,
        overview: `Detailed overview description for test movie ${i} with enough length.`,
        posterPath: `/poster_${i}.jpg`,
        backdropPath: `/backdrop_${i}.jpg`,
        releaseYear: 2010 + (i % 14),
        popularity: 50 + i,
        voteAverage: 7.5 + (i % 20) / 10,
        voteCount: 1000 + i * 10,
        genres: ["Dram", "Aksiyon"],
        metadata: { genres: ["Dram", "Aksiyon"], director: "Test Director" },
        adult: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (name === "tvShow") {
    for (let i = 1; i <= 60; i++) {
      const id = `tv-${i}`;
      store.set(id, {
        id,
        tmdbId: 20000 + i,
        name: `Test TV Show ${i}`,
        originalName: `Test TV Show ${i}`,
        overview: `Detailed overview description for test TV show ${i} with enough length.`,
        posterPath: `/poster_tv_${i}.jpg`,
        backdropPath: `/backdrop_tv_${i}.jpg`,
        firstAirDate: "2018-05-10",
        popularity: 60 + i,
        voteAverage: 8.0 + (i % 15) / 10,
        voteCount: 800 + i * 10,
        metadata: { genres: ["Dram", "Gizem"], numberOfSeasons: 3, numberOfEpisodes: 24 },
        adult: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const flattenWhere = (where) => {
    if (!where) return {};
    const flat = {};
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        if (
          "in" in value ||
          "notIn" in value ||
          "not" in value ||
          "equals" in value ||
          "lte" in value ||
          "gte" in value ||
          "lt" in value ||
          "gt" in value ||
          "contains" in value ||
          "none" in value ||
          "some" in value
        ) {
          flat[key] = value;
        } else {
          for (const [subKey, subVal] of Object.entries(value)) {
            flat[subKey] = subVal;
          }
        }
      } else {
        flat[key] = value;
      }
    }
    return flat;
  };

  const matchesWhere = (item, where) => {
    if (!where) return true;
    const flatWhere = flattenWhere(where);
    for (const [key, value] of Object.entries(flatWhere)) {
      if (value === undefined) continue;
      if (typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        if ("none" in value && typeof value.none === "object") {
          const interStore = name === "movie" ? allStores.movieInteraction : allStores.tvInteraction;
          if (interStore) {
            for (const inter of interStore.store.values()) {
              const relId = name === "movie" ? inter.movieId : inter.tvShowId;
              if (relId === item.id && matchesWhere(inter, value.none)) {
                return false;
              }
            }
          }
        } else if ("some" in value && typeof value.some === "object") {
          const interStore = name === "movie" ? allStores.movieInteraction : allStores.tvInteraction;
          let found = false;
          if (interStore) {
            for (const inter of interStore.store.values()) {
              const relId = name === "movie" ? inter.movieId : inter.tvShowId;
              if (relId === item.id && matchesWhere(inter, value.some)) {
                found = true;
                break;
              }
            }
          }
          if (!found) return false;
        } else if ("in" in value && Array.isArray(value.in)) {
          if (!value.in.includes(item[key])) return false;
        } else if ("notIn" in value && Array.isArray(value.notIn)) {
          if (value.notIn.includes(item[key])) return false;
        } else if ("not" in value && item[key] === value.not) {
          return false;
        } else if ("equals" in value && item[key] !== value.equals) {
          return false;
        } else if ("lte" in value && item[key] > value.lte) {
          return false;
        } else if ("gte" in value && item[key] < value.gte) {
          return false;
        } else if ("lt" in value && item[key] >= value.lt) {
          return false;
        } else if ("gt" in value && item[key] <= value.gt) {
          return false;
        } else if ("contains" in value && typeof item[key] === "string") {
          if (!item[key].toLowerCase().includes(String(value.contains).toLowerCase())) return false;
        }
      } else if (item[key] !== value) {
        return false;
      }
    }
    return true;
  };

  const expandIncludes = (item, include) => {
    if (!item || !include) return item;
    const clone = { ...item };
    if (include.movie && clone.movieId && allStores.movie) {
      clone.movie = allStores.movie.store.get(clone.movieId) || { id: clone.movieId, title: "Test Movie", metadata: { genres: ["Dram"] } };
    }
    if (include.tvShow && clone.tvShowId && allStores.tvShow) {
      clone.tvShow = allStores.tvShow.store.get(clone.tvShowId) || { id: clone.tvShowId, name: "Test TV Show", metadata: { genres: ["Dram"] } };
    }
    if (include.user && clone.userId && allStores.user) {
      clone.user = allStores.user.store.get(clone.userId) || { id: clone.userId, name: "Test User" };
    }
    return clone;
  };

  const modelObj = {
    store,
    findUnique: async (args) => {
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) return expandIncludes(item, args?.include);
      }
      return null;
    },
    findFirst: async (args) => {
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) return expandIncludes(item, args?.include);
      }
      return null;
    },
    findMany: async (args) => {
      const results = [];
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) results.push(expandIncludes(item, args?.include));
      }
      let sliced = results;
      if (args?.skip) sliced = sliced.slice(args.skip);
      if (args?.take) sliced = sliced.slice(0, args.take);
      return sliced;
    },
    count: async (args) => {
      let count = 0;
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) count++;
      }
      return count;
    },
    create: async (args) => {
      const id = args?.data?.id || `id-${name}-${idCounter++}`;
      const obj = { id, ...(args?.data || {}), createdAt: new Date(), updatedAt: new Date() };
      store.set(id, obj);
      return expandIncludes(obj, args?.include);
    },
    update: async (args) => {
      let target = null;
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) {
          target = item;
          break;
        }
      }
      if (!target) {
        const flatWhere = flattenWhere(args?.where);
        const id = flatWhere.id || `id-${name}-${idCounter++}`;
        target = { id, ...flatWhere };
        store.set(id, target);
      }
      Object.assign(target, args?.data || {}, { updatedAt: new Date() });
      return expandIncludes(target, args?.include);
    },
    updateMany: async (args) => {
      let count = 0;
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) {
          Object.assign(item, args?.data || {}, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    },
    upsert: async (args) => {
      let target = null;
      for (const item of store.values()) {
        if (matchesWhere(item, args?.where)) {
          target = item;
          break;
        }
      }
      if (target) {
        Object.assign(target, args?.update || {}, { updatedAt: new Date() });
        return expandIncludes(target, args?.include);
      } else {
        const flatWhere = flattenWhere(args?.where || {});
        const id = flatWhere.id || args?.create?.id || `id-${name}-${idCounter++}`;
        const obj = { id, ...flatWhere, ...(args?.create || {}), createdAt: new Date(), updatedAt: new Date() };
        store.set(id, obj);
        return expandIncludes(obj, args?.include);
      }
    },
    delete: async (args) => {
      for (const [id, item] of store.entries()) {
        if (matchesWhere(item, args?.where)) {
          store.delete(id);
          return item;
        }
      }
      return { id: args?.where?.id || "deleted" };
    },
    deleteMany: async (args) => {
      let count = 0;
      for (const [id, item] of Array.from(store.entries())) {
        if (matchesWhere(item, args?.where)) {
          store.delete(id);
          count++;
        }
      }
      return { count };
    },
  };

  return modelObj;
}

const allModelStores = {};

const mockPrismaDb = new Proxy({}, {
  get(target, prop) {
    if (prop === "$transaction") {
      return async (callback) => {
        if (typeof callback === "function") {
          return callback(mockPrismaDb);
        }
        return Promise.all(callback);
      };
    }
    if (!target[prop]) {
      const model = createModelMock(String(prop), allModelStores);
      target[prop] = model;
      allModelStores[String(prop)] = model;
    }
    return target[prop];
  },
});

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@prisma/client") {
    return {
      ...prismaEnums,
      PrismaClient: function () {
        return mockPrismaDb;
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: process.cwd(),
      paths: { "@/*": ["./*"] },
    },
  });

  if (filename.endsWith("lib\\db\\client.ts") || filename.endsWith("lib/db/client.ts")) {
    module.exports = { db: mockPrismaDb };
    return;
  }

  module._compile(result.outputText, filename);
};

require.extensions[".tsx"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: process.cwd(),
      paths: { "@/*": ["./*"] },
    },
  });
  module._compile(result.outputText, filename);
};

if (require.main === module) {
  require("./runner.ts");
}

# Architecture

AegisHeal is a Node.js monorepo with two npm workspaces: `server` (API + autonomous agent) and `client` (React dashboard). In development they run on two ports; in production the server also serves the built dashboard from one origin.

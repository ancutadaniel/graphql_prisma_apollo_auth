import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import express from 'express';
import { expressjwt } from 'express-jwt';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';

// Transition to WebSocket server with graphql-ws
import { createServer as createHttpServer } from 'http';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer as useWsServer } from 'graphql-ws/lib/use/ws';

import { PubSub } from 'graphql-subscriptions';
import resolvers from './src/resolvers/index.js';

const pubsub = new PubSub();
const prisma = new PrismaClient();

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');
const typeDefs = await readFile('./src/schema.graphql', 'utf8');

const app = express();

app.use(
  cors(),
  express.json(),
  expressjwt({
    algorithms: ['HS256'],
    credentialsRequired: false,
    secret: JWT_SECRET,
  })
);

// Create a context function that returns the token from the request headers HTTP
const getHttpContext = async ({ req }) => ({
  prisma,
  pubsub,
  req,
});

// Create a context function that returns the token from the connection WebSocket headers
const getWsContext = ({ connectionParams }) => ({
  prisma,
  pubsub,
  req: connectionParams,
});

// Create an HTTP server and pass our Express
const httpServer = createHttpServer(app);

// Create a WebSocket server and pass our HTTP server
// Extends our HTTP server to accept WebSocket connections
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Create a schema that is a GraphQL schema object, that grouped together types and resolvers
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Use the WebSocket server to handle GraphQL subscriptions
useWsServer({ schema, context: getWsContext }, wsServer);

const apolloServer = new ApolloServer({
  schema,
  context: getHttpContext,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await apolloServer.start();
apolloServer.applyMiddleware({ app, path: '/graphql' });

httpServer.listen({ port: process.env.PORT }, () => {
  console.log(`Server running on port http://localhost:${process.env.PORT}`);
  console.log(
    `GraphQL endpoint: http://localhost:${process.env.PORT}${apolloServer.graphqlPath}`
  );
});

import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import express from 'express';
import { expressjwt } from 'express-jwt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';

import Query from './src/resolvers/Query.js';
import Mutation from './src/resolvers/Mutation.js';
import Subscription from './src/resolvers/Subscription.js';

// Transition to WebSocket server with graphql-ws
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { createServer as createHttpServer } from 'http';
import { useServer as useWsServer } from 'graphql-ws/lib/use/ws';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();
const prisma = new PrismaClient();

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');

const typeDefs = await readFile('./src/schema.graphql', 'utf8');

const resolvers = {
  Query,
  Mutation,
  Subscription,
};

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

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user && user.password === password) {
    const token = jwt.sign({ sub: user.id }, JWT_SECRET);
    res.json({ token });
  } else {
    res.sendStatus(401);
  }
});

const getHttpContext = async ({ req }) => {
  // find the user by the id in the JWT token and add it to the context
  // auth is added by express-jwt if the authorization header is present => req.auth Authorization header - Bearer token

  const user =
    req.auth && (await prisma.user.findUnique({ where: { id: req.auth.sub } }));

  return { user };
};

// Create a context function that returns the token from the connection WebSocket headers
const getWsContext = ({ connectionParams }) => {
  const token = connectionParams?.accessToken;
  if (token) {
    // Verify the token and return the userId
    const payload = jwt.verify(token, JWT_SECRET);
    return { userId: payload.sub };
  }
  return {};
};

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
useWsServer({ schema, context: { getWsContext, prisma, pubsub } }, wsServer);

const apolloServer = new ApolloServer({
  schema,
  context: { getHttpContext, prisma, pubsub },
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await apolloServer.start();
apolloServer.applyMiddleware({ app, path: '/graphql' });

httpServer.listen({ port: process.env.PORT }, () => {
  console.log(`Server running on port http://localhost:${process.env.PORT}`);
  console.log(
    `GraphQL endpoint: http://localhost:${process.env.PORT}${apolloServer.graphqlPath}`
  );
});

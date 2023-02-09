import { withFilter } from 'graphql-subscriptions';
import getUserId from '../utils/getUserId.js';

const Subscription = {
  comment: {
    async subscribe(parent, { postId }, { prisma, pubsub }, info) {
      const post = await prisma.post.findUnique({
        where: {
          id: postId,
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // The subscribe method returns an async iterator on channel name 'comment ${postId}'
      return pubsub.asyncIterator(`comment ${postId}`);
    },
  },
  post: {
    // The subscribe method returns an async iterator on channel name 'post'
    // withFilter is used to filter the subscription based on the condition
    subscribe: withFilter(
      (parent, args, { pubsub }, info) => {
        // Subscribe to the 'post' channel where new posts are published or post are published
        const channel = 'post';
        // The subscribe method returns an async iterator on channel name 'post'
        return pubsub.asyncIterator(channel);
      },
      (payload, variables, { req }) => {
        const userId = getUserId(req, false);
        const post = payload.post.data;
        if (post.published) {
          return true;
        } else {
          return post.authorId === userId;
        }
      }
    ),
  },
  myPost: {
    // The subscribe method returns an async iterator on channel name 'myPost'
    // withFilter is used to filter the subscription based on the condition
    subscribe: withFilter(
      (parent, args, { pubsub, req }, info) => {
        const userId = getUserId(req);
        if (!userId) {
          throw new Error('Authentication required');
        }
        return pubsub.asyncIterator('myPost');
      },
      async (payload, variables, { prisma }) => {
        const post = await prisma.post.findUnique({
          where: {
            id: payload.myPost.data.id,
          },
        });

        if (!post) {
          throw new Error('Post not found');
        }

        return post.authorId === userId;
      }
    ),
  },
};

export default Subscription;

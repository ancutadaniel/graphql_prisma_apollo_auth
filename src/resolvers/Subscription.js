const Subscription = {
  comment: {
    subscribe(parent, { postId }, { prisma, pubsub }, info) {
      const post = prisma.post.findUnique({
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
    subscribe(parent, args, { pubsub }, info) {
      return pubsub.asyncIterator('post');
    },
  },
};

export default Subscription;

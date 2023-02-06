const Mutation = {
  createUser: async (parent, args, { prisma, bcrypt }, info) => {
    const { data } = args;
    const emailExists = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (emailExists) throw new Error('Email already exists.');

    if (data.password.length < 8)
      throw new Error('Password must be at least 8 characters long.');

    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: passwordHash,
      },
    });
  },
  updateUser: async (parent, args, { prisma }, info) => {
    const { id, data } = args;
    const userExists = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!userExists) throw new Error('User not found.');

    return prisma.user.update({
      where: {
        id,
      },
      data: {
        email: data.email,
        name: data.name,
      },
    });
  },
  deleteUser: async (parent, args, { prisma }, info) => {
    const { id } = args;
    const userExists = await prisma.user.findUnique({ where: { id } });

    if (!userExists) throw new Error('User not found.');

    // Delete the user's associated posts
    const posts = await prisma.post.findMany({
      where: {
        authorId: id,
      },
    });
    // postIds is an array of post ids that we want to delete
    const postIds = posts.map((post) => post.id);
    await prisma.post.deleteMany({
      where: {
        id: {
          in: postIds,
        },
      },
    });

    // Delete the user's associated comments
    const comments = await prisma.comment.findMany({
      where: {
        authorId: id,
      },
    });

    // commentIds is an array of comment ids that we want to delete
    const commentIds = comments.map((comment) => comment.id);
    await prisma.comment.deleteMany({
      where: {
        id: {
          in: commentIds,
        },
      },
    });

    // Delete the user
    return prisma.user.delete({
      where: {
        id,
      },
    });
  },
  createPost: async (parent, args, { prisma, pubsub }, info) => {
    const { data } = args;
    const post = await prisma.post.create({
      data: {
        title: data.title,
        body: data.body,
        published: data.published,
        author: {
          connect: {
            id: data.authorId,
          },
        },
      },
      include: {
        author: true,
        comments: true,
      },
    });

    if (data.published) {
      // Publish the post to the subscription
      pubsub.publish('post', {
        post: {
          mutation: 'CREATED',
          data: post,
        },
      });
    }

    return post;
  },
  updatePost: async (parent, args, { prisma, pubsub }, info) => {
    const { id, data } = args;
    const post = await prisma.post.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        body: data.body,
        published: data.published,
      },
      include: {
        author: true,
        comments: true,
      },
    });

    if (!post) throw new Error('Post not found.');
    // store the original post
    const originalPost = { ...post };

    if (originalPost.published && !post.published) {
      // Post was published and now it's not - DELETED
      pubsub.publish('post', {
        post: {
          mutation: 'DELETED',
          data: originalPost,
        },
      });
    } else if (!originalPost.published && post.published) {
      // Post was not published and now it's published - CREATED
      pubsub.publish('post', {
        post: {
          mutation: 'CREATED',
          data: post,
        },
      });
    } else if (originalPost.published && post.published) {
      // Post was published and now it's published - UPDATED
      pubsub.publish('post', {
        post: {
          mutation: 'UPDATED',
          data: post,
        },
      });
    }

    return post;
  },
  deletePost: async (parent, args, { prisma, pubsub }, info) => {
    const { id } = args;
    const postExists = await prisma.post.findUnique({ where: { id } });

    if (!postExists) throw new Error('Post not found.');

    // Delete the post's associated comments
    const comments = await prisma.comment.findMany({
      where: {
        postId: id,
      },
    });

    // commentIds is an array of comment ids that we want to delete
    const commentIds = comments.map((comment) => comment.id);
    await prisma.comment.deleteMany({
      where: {
        id: {
          in: commentIds,
        },
      },
    });

    if (postExists.published) {
      // Publish the post to the subscription
      pubsub.publish('post', {
        post: {
          mutation: 'DELETED',
          data: postExists,
        },
      });
    }
    // Delete the post
    return prisma.post.delete({
      where: {
        id,
      },
    });
  },
  createComment: async (parent, args, { prisma, pubsub }, info) => {
    const { data } = args;
    const comment = await prisma.comment.create({
      data: {
        text: data.text,
        author: {
          connect: {
            id: data.authorId,
          },
        },
        post: {
          connect: {
            id: data.postId,
          },
        },
      },
      include: {
        author: true,
        post: true,
      },
    });

    // Publish the comment to the subscription
    pubsub.publish(`comment ${data.postId}`, {
      comment: {
        mutation: 'CREATED',
        data: comment,
      },
    });

    return comment;
  },
  updateComment: async (parent, args, { prisma, pubsub }, info) => {
    const { id, data } = args;
    const comment = await prisma.comment.update({
      where: {
        id,
      },
      data: {
        text: data.text,
      },
      include: {
        author: true,
        post: true,
      },
    });

    // Publish the comment to the subscription
    pubsub.publish(`comment ${comment.postId}`, {
      comment: {
        mutation: 'UPDATED',
        data: comment,
      },
    });

    return comment;
  },
  deleteComment: async (parent, args, { prisma, pubsub }, info) => {
    const { id } = args;
    const comment = await prisma.comment.delete({
      where: {
        id,
      },
      include: {
        author: true,
        post: true,
      },
    });

    // Publish the comment to the subscription
    pubsub.publish(`comment ${comment.postId}`, {
      comment: {
        mutation: 'DELETED',
        data: comment,
      },
    });

    return comment;
  },
};

export default Mutation;

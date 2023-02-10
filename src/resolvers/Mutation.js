import bcrypt from 'bcryptjs';
import getUserId from '../utils/getUserId.js';
import postExists from '../utils/postExists.js';
import generateToken from '../utils/generateToken.js';
import hashPassword from '../utils/hashPassword.js';

const Mutation = {
  login: async (parent, args, { prisma }, info) => {
    const {
      data: { email, password },
    } = args;
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) throw new Error('Unable to login.');

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) throw new Error('Unable to login.');

    if (user && valid) {
      const token = generateToken(user.id);
      // Remove the password from the user object before returning it
      const { password, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    }
  },
  createUser: async (parent, args, { prisma }, info) => {
    const { data } = args;
    const emailExists = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (emailExists) throw new Error('Email already exists.');

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: await hashPassword(data.password),
      },
    });

    // Remove the password from the user object before returning it
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: generateToken(user.id),
    };
  },
  updateUser: async (parent, args, { prisma, req }, info) => {
    const id = getUserId(req);
    const { data } = args;
    const userExists = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!userExists) throw new Error('User not found.');

    // If the user is updating their password, hash it
    if (
      data.password &&
      data.password.length > 0 &&
      data.password !== userExists.password &&
      typeof data.password === 'string'
    ) {
      data.password = await hashPassword(data.password);
    }

    // Remove the password from the user object before returning it
    const { password, ...userWithoutPassword } = userExists;

    await prisma.user.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });

    return userWithoutPassword;
  },
  deleteUser: async (parent, args, { prisma, req }, info) => {
    const id = getUserId(req);

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
  createPost: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);

    const { data } = args;
    const post = await prisma.post.create({
      data: {
        title: data.title,
        body: data.body,
        published: data.published,
        author: {
          connect: {
            id: userId,
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
      pubsub.publish('myPost', {
        myPost: {
          mutation: 'CREATED',
          data: post,
        },
      });
    }

    return post;
  },
  updatePost: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);
    const { id, data } = args;

    const postOK = await postExists(id, userId, prisma);

    // If the post is published and the user wants to unpublish it delete all the comments
    if (postOK.published !== data.published) {
      await prisma.comment.deleteMany({
        where: {
          postId: id,
        },
      });
    }

    if (postOK) {
      const post = await prisma.post.update({
        where: {
          id,
        },
        data: {
          ...data,
        },
        include: {
          author: true,
          comments: true,
        },
      });

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
    }
  },
  deletePost: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);
    const { id } = args;

    const post = await postExists(id, userId, prisma);

    if (post) {
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

      if (post.published) {
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
    }
  },
  createComment: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);
    const { data } = args;

    const postPublished = await prisma.post.findUnique({
      where: {
        id: data.postId,
      },
      select: {
        published: true,
      },
    });

    if (!postPublished) throw new Error('Post not found.');

    const comment = await prisma.comment.create({
      data: {
        text: data.text,
        author: {
          connect: {
            id: userId,
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
  updateComment: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);
    const { id, data } = args;

    const commentExists = await prisma.comment.findUnique({
      where: {
        id: id,
      },
    });

    if (commentExists.authorId !== userId)
      throw new Error('Not authorized to perform this action.');
    else {
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
    }
  },
  deleteComment: async (parent, args, { prisma, pubsub, req }, info) => {
    const userId = getUserId(req);
    const { id } = args;

    const commentExists = await prisma.comment.findUnique({
      where: {
        id: id,
      },
    });

    if (commentExists.authorId !== userId)
      throw new Error('Not authorized to perform this action.');
    else {
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
    }
  },
};

export default Mutation;

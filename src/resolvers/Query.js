import getUserId from '../utils/getUserId.js';

const Query = {
  user: async (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        posts: {
          select: {
            id: true,
            title: true,
            body: true,
            published: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },
  post: async (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req, false);
    const { id } = args;
    const posts = await prisma.post.findMany({
      where: {
        id,
        OR: [
          {
            published: true,
          },
          {
            authorId: userId,
          },
        ],
      },
      select: {
        id: true,
        title: true,
        body: true,
        published: true,

        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    if (posts.length === 0) {
      throw new Error('Post not found');
    }

    return posts[0];
  },
  allUsers: async (parent, args, { prisma, req }, info) => {
    // if query is provided, search for users by name or email
    if (args.query) {
      return await prisma.user.findMany({
        where: {
          OR: [{ name: args.query }],
        },
        select: {
          id: true,
          name: true,
          email: true,
          posts: {
            select: {
              id: true,
              title: true,
              body: true,
              published: true,
            },
          },
          comments: {
            select: {
              id: true,
              text: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    }
    // otherwise, return all users
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        posts: {
          select: {
            id: true,
            title: true,
            body: true,
            published: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  },
  allPosts: async (parent, args, { prisma }, info) => {
    // if query is provided, search for posts by title or body
    if (args.query) {
      return await prisma.post.findMany({
        where: {
          published: true,
          OR: [{ title: args.query }, { body: args.query }],
        },
        select: {
          id: true,
          title: true,
          body: true,
          published: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          comments: {
            select: {
              id: true,
              text: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    }
    return await prisma.post.findMany({
      where: {
        published: true,
      },
      select: {
        id: true,
        title: true,
        body: true,
        published: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },
  allComments: async (parent, args, { prisma }, info) =>
    await prisma.comment.findMany({
      select: {
        id: true,
        text: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            published: true,
          },
        },
      },
    }),
  myPosts: async (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req);

    if (args.query) {
      const posts = await prisma.post.findMany({
        where: {
          authorId: userId,
          OR: [{ title: args.query }, { body: args.query }],
        },
        select: {
          id: true,
          title: true,
          body: true,
          published: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          comments: {
            select: {
              id: true,
              text: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (posts.length === 0) {
        throw new Error('Posts not found');
      }

      return posts;
    }

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
      },
      select: {
        id: true,
        title: true,
        body: true,
        published: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (posts.length === 0) {
      throw new Error('Posts not found');
    }

    return posts;
  },
};

export default Query;

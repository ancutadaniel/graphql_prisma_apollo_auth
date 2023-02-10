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
    const skip = args.skip || 0;
    const take = args.take || 10;

    const query = {
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
    };

    if (skip) {
      query.skip = skip;
    }

    if (take) {
      query.take = take;
    }

    if (args.query) {
      query.where = {
        OR: [{ name: args.query }, { email: args.query }],
      };
    }

    return await prisma.user.findMany(query);
  },
  allPosts: async (parent, args, { prisma }, info) => {
    const whereClause = {
      published: true,
    };
    const orderByClause = {
      updatedAt: 'desc',
    };

    const skip = args.skip || 0;
    const take = args.take || 10;

    if (args.query) {
      whereClause.OR = [{ title: args.query }, { body: args.query }];
    }

    const query = {
      where: whereClause,
      take,
      skip,
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
      orderBy: orderByClause,
    };

    return await prisma.post.findMany(query);
  },
  allComments: async (parent, args, { prisma }, info) => {
    const skip = args.skip || 0;
    const take = args.take || 10;

    const query = {
      take,
      skip,

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
    };

    return await prisma.comment.findMany(query);
  },
  myPosts: async (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req);

    const whereClause = {
      authorId: userId,
    };

    const orderByClause = {
      updatedAt: 'asc',
    };

    const skip = args.skip || 0;
    const take = args.take || 10;

    if (args.query) {
      whereClause.OR = [{ title: args.query }, { body: args.query }];
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      take,
      skip,
      cursor: {
        id: args.cursor,
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
      orderBy: orderByClause,
    });

    if (posts.length === 0) {
      throw new Error('Posts not found');
    }

    return posts;
  },
};

export default Query;

const Query = {
  user: (parent, args, { user, prisma }, info) => {
    return prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        posts: true,
        comments: true,
      },
    });
  },

  post: (parent, args, { prisma }, info) =>
    prisma.post.findUnique({
      where: {
        id: args.id,
      },
      include: {
        author: true,
        comments: true,
      },
    }),

  allUsers: (parent, args, { prisma }, info) => {
    // if query is provided, search for users by name or email
    if (args.query) {
      return prisma.user.findMany({
        where: {
          OR: [{ email: args.query }, { name: args.query }],
        },
        include: {
          posts: true,
          comments: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    }
    // otherwise, return all users
    return prisma.user.findMany({
      include: {
        posts: true,
        comments: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  },

  allPosts: (parent, args, { prisma }, info) => {
    // if query is provided, search for posts by title or body
    if (args.query) {
      return prisma.post.findMany({
        where: {
          OR: [{ title: args.query }, { body: args.query }],
        },
        include: {
          author: true,
          comments: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    }

    return prisma.post.findMany({
      include: {
        author: true,
        comments: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },

  allComments: (parent, args, { prisma }, info) =>
    prisma.comment.findMany({
      include: {
        author: true,
        post: true,
      },
    }),
};

export default Query;

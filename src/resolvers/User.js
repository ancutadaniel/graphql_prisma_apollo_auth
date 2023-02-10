import getUserId from '../utils/getUserId.js';

const User = {
  // This is the resolver for the User type's email field.
  email: (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req, false);
    if (!userId) return null;
    // If the user is logged in, return the email address. else return null.
    return userId === parent.id ? parent.email : null;
  },

  // This is the resolver for the User type's posts field.
  posts: async (parent, args, { prisma, req }, info) => {
    const userId = getUserId(req, false);

    const posts = await prisma.post.findMany({
      where: {
        authorId: parent.id,
        published: true,
      },
    });

    if (userId === parent.id) {
      const draftPosts = await prisma.post.findMany({
        where: {
          authorId: parent.id,
          published: false,
        },
      });
      return posts.concat(draftPosts);
    }

    return posts;
  },
};

export default User;

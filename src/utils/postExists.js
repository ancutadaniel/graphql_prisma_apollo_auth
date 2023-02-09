const postExists = async (id, userId, prisma) => {
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found.');

    const author = await prisma.user.findUnique({ where: { id: userId } });
    if (!author) throw new Error('User not found.');

    if (post.authorId === author.id) return post;
    else throw new Error('Not authorized to perform this action.');
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default postExists;

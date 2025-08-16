import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const extensionService = strapi.service('plugin::graphql.extension');

    // ensure it's only used once
    extensionService.use(() => ({
      typeDefs: `
        type TodoStats {
          total: Int
          completed: Int
          notCompleted: Int
        }

        extend type Query {
          todoStats: TodoStats
        }
      `,
      resolvers: {
        Query: {
          todoStats: {
            resolve: async () => {
              const totalTodos = await strapi.db
                .query('api::todo.todo')
                .count({ where: { publishedAt: { $notNull: true } } });

              const completedCount = await strapi.db
                .query('api::todo.todo')
                .count({
                  where: { completed: true, publishedAt: { $notNull: true } },
                });

              const notCompletedCount = await strapi.db
                .query('api::todo.todo')
                .count({
                  where: { completed: false, publishedAt: { $notNull: true } },
                });

              return {
                total: totalTodos,
                completed: completedCount,
                notCompleted: notCompletedCount,
              };
            },
          },
        },
      },
      resolversConfig: {
        'Query.todoStats': { auth: false },
      },
    }));
  },

  bootstrap() {},
};


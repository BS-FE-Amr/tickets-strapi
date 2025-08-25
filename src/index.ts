import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const extensionService = strapi.service('plugin::graphql.extension');

    extensionService.use(() => ({
      typeDefs: `
        type TodoStats {
          total: Int!
          completed: Int!
          notCompleted: Int!
        }

        type EmployeeAssignmentStats {
          totalEmployees: Int!
          assignedEmployees: Int!
          unassignedEmployees: Int!
        }

        extend type Query {
          todoStats: TodoStats
          employeeAssignmentStats: EmployeeAssignmentStats
        }
      `,
      resolvers: {
        Query: {
          todoStats: {
            resolve: async () => {
              const total = await strapi.db
                .query('api::todo.todo')
                .count({ where: { publishedAt: { $notNull: true } } });

              const completed = await strapi.db.query('api::todo.todo').count({
                where: { completed: true, publishedAt: { $notNull: true } },
              });

              return {
                total,
                completed,
                notCompleted: total - completed,
              };
            },
          },
          employeeAssignmentStats: {
            resolve: async () => {
              // 1. Count all employees
              const totalEmployees = await strapi.db
                .query('api::employee.employee')
                .count({
                  where: { publishedAt: { $notNull: true } },
                });

              // 2. Find all todos with employees populated
              const todos = await strapi.db.query('api::todo.todo').findMany({
                where: { publishedAt: { $notNull: true } },
                populate: { employee: true },
              });

              // 3. Collect distinct employee IDs
              const assignedEmployeeIds = new Set();
              todos.forEach((todo: any) => {
                if (todo.employee) {
                  // many-to-many: todo.employee is an array
                  (Array.isArray(todo.employee)
                    ? todo.employee
                    : [todo.employee]
                  ).forEach((emp: any) => assignedEmployeeIds.add(emp.id));
                }
              });

              const assignedEmployees = assignedEmployeeIds.size;
              const unassignedEmployees = totalEmployees - assignedEmployees;

              return {
                totalEmployees,
                assignedEmployees,
                unassignedEmployees,
              };
            },
          },
        },
      },
      resolversConfig: {
        'Query.todoStats': { auth: false },
        'Query.employeeAssignmentStats': { auth: false },
      },
    }));
  },

  bootstrap() {},
};


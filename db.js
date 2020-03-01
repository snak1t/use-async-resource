const faker = require('faker');

const users = Array.from({ length: 1000 }, (_, index) => {
  return {
    id: index,
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    location: faker.address.city(),
  };
});

module.exports = () => ({
  users,
});

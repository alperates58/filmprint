export const TEST_FIXTURES = {
  users: {
    newUser: {
      email: "e2e_new_user@filmprint.test",
      password: "TestPassword123!",
      name: "E2E New User",
    },
    calibrated30User: {
      email: "e2e_calibrated_30@filmprint.test",
      password: "TestPassword123!",
      name: "E2E Calibrated User",
    },
    powerUser: {
      email: "e2e_power_user_1000@filmprint.test",
      password: "TestPassword123!",
      name: "E2E Power User",
    },
    adminUser: {
      email: "admin@filmprint.test",
      password: "AdminPassword123!",
      name: "E2E System Admin",
    },
  },
  movies: [
    {
      tmdbId: 157336,
      title: "Interstellar",
      releaseYear: 2014,
      genres: ["Bilim Kurgu", "Dram", "Macera"],
    },
    {
      tmdbId: 27205,
      title: "Inception",
      releaseYear: 2010,
      genres: ["Bilim Kurgu", "Aksiyon", "Macera"],
    },
    {
      tmdbId: 680,
      title: "Pulp Fiction",
      releaseYear: 1994,
      genres: ["Suç", "Dram"],
    },
  ],
};

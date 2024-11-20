module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: "postcss-loader",
        options: {
          postcssOptions: {
            plugins: [
              require("tailwindcss"),
              require("autoprefixer"),
            ],
          },
        },
      },
    ],
  },
};
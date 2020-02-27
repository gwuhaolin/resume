const fs = require("fs");
const path = require("path");
const UglifyJsPlugin = require("webpack/lib/optimize/UglifyJsPlugin");
const DefinePlugin = require("webpack/lib/DefinePlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const EndWebpackPlugin = require("end-webpack-plugin");
const { WebPlugin } = require("web-webpack-plugin");
const ghpages = require("gh-pages");
const puppeteer = require("puppeteer");

function publishGhPages() {
  return new Promise((resolve, reject) => {
    ghpages.publish(outputPath, { dotfiles: true }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const outputPath = path.resolve(__dirname, ".public");
module.exports = {
  output: {
    path: outputPath,
    publicPath: "",
    filename: "[name]_[chunkhash:8].js"
  },
  resolve: {
    // 加快搜索速度
    modules: [path.resolve(__dirname, "node_modules")],
    // es tree-shaking
    mainFields: ["jsnext:main", "browser", "main"]
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        // 提取出css
        loaders: ExtractTextPlugin.extract({
          fallback: "style-loader",
          // 压缩css
          use: ["css-loader?minimize", "postcss-loader", "sass-loader"]
        }),
        include: path.resolve(__dirname, "src")
      },
      {
        test: /\.css$/,
        // 提取出css
        loaders: ExtractTextPlugin.extract({
          fallback: "style-loader",
          // 压缩css
          use: ["css-loader?minimize", "postcss-loader"]
        })
      },
      {
        test: /\.(gif|png|jpe?g|eot|woff|ttf|svg|pdf)$/,
        loader: "base64-inline-loader"
      }
    ]
  },
  entry: {
    main: "./src/main.js"
  },
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new UglifyJsPlugin({
      // 最紧凑的输出
      beautify: false,
      // 删除所有的注释
      comments: false,
      compress: {
        // 在UglifyJs删除没有用到的代码时不输出警告
        warnings: false,
        // 删除所有的 `console` 语句，可以兼容ie浏览器
        drop_console: true,
        // 内嵌定义了但是只用到一次的变量
        collapse_vars: true,
        // 提取出出现多次但是没有定义成变量去引用的静态值
        reduce_vars: true
      }
    }),
    new WebPlugin({
      template: "./src/index.html",
      filename: "index.html"
    }),
    new ExtractTextPlugin({
      filename: "[name]_[contenthash:8].css",
      allChunks: true
    }),
    new EndWebpackPlugin(async () => {
      // 自定义域名
      fs.writeFileSync(path.resolve(outputPath, "CNAME"), "resume.wuhaolin.cn");

      await publishGhPages();

      // 调用 Chrome puppeteer渲染出 PDF 文件
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto("http://resume.wuhaolin.cn", {
        // 这里注意改成你的在线简历的网站
        waitUntil: "networkidle2"
      });
      await page.pdf({
        path: `${path.resolve(outputPath, "resume.pdf")}`,
        format: "A4"
      });
      await browser.close();
      // 重新发布到 ghpages
      await publishGhPages();
    })
  ]
};

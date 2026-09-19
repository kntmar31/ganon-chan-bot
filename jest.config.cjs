// jest.config.cjs
//
// package.json が "type": "module" のため、Jest の設定は CommonJS 形式の .cjs で書く。
//
// ソース側は import ... from './foo.js' のように、実体は .ts でも拡張子 .js を付けて書く
// (NodeのESM解決規則に合わせた慣習。ビルド後の dist/ に実際に .js が生成されることを見越した書き方)。
// ts-jest は CommonJS として出力するため、require('./foo.js') という文字列は書き換えられない。
// そこで moduleNameMapper で相対パス末尾の .js を取り除き、実体の .ts を解決できるようにしている。
//
// 注意：features/index.ts は import.meta を使うため、CommonJS 変換のこのテスト環境では扱えない。
// そのため、ローダーそのもののテストは対象外にしている。
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
  },
  testMatch: ['**/tests/**/*.test.ts']
}
